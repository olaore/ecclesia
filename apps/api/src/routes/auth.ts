import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { usersTable } from "@nehemiah/db/schema";
import { registerSchema, loginSchema } from "@nehemiah/core/schemas";
import { hashPassword, verifyPassword } from "../utils/crypto";
import { rateLimit } from "../middleware/rate-limit";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const auth = new Hono<{ Bindings: Bindings }>();

// Rate limit: 5 attempts per minute per IP
auth.use("/register", rateLimit({ limit: 5, windowMs: 60_000 }));
auth.use("/login", rateLimit({ limit: 10, windowMs: 60_000 }));

const getJwtSecret = (env: Bindings): string => {
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured. Refusing to sign tokens.");
  }
  return env.JWT_SECRET;
};

auth.post("/register", async (c) => {
  const body = await c.req.json();
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    return c.json({ success: false, error: result.error.message }, 400);
  }

  const { email, password } = result.data;
  const db = drizzle(c.env.DB);

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .get();

  if (existingUser) {
    return c.json({ success: false, error: "Email already exists" }, 400);
  }

  // Check if this is the first user
  const userCount = await db
    .select()
    .from(usersTable)
    .get();

  const isFirstUser = !userCount;
  const finalRole = isFirstUser ? "sysadmin" : "user";

  const passwordHash = await hashPassword(password);
  const newUser = await db
    .insert(usersTable)
    .values({
      email,
      passwordHash,
      role: finalRole as any,
    })
    .returning()
    .get();

  const token = await sign(
    {
      userId: newUser.id,
      role: newUser.role,
      unitId: newUser.unitId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    },
    getJwtSecret(c.env)
  );

  return c.json(
    {
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          unitId: newUser.unitId,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
        },
        token,
      },
    },
    201
  );
});

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return c.json({ success: false, error: result.error.message }, 400);
  }

  const { email, password } = result.data;
  const db = drizzle(c.env.DB);

  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .get();

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ success: false, error: "Invalid email or password" }, 401);
  }

  const token = await sign(
    {
      userId: user.id,
      role: user.role,
      unitId: user.unitId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    },
    getJwtSecret(c.env)
  );

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        unitId: user.unitId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    },
  });
});

export default auth;
