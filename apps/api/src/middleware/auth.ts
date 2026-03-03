import { Context, Next } from "hono";
import { jwt } from "hono/jwt";
import { UserRole } from "@nehemiah/core/schemas";

export const verifyJWT = (secret: string) => jwt({ secret, alg: "HS256" });

export const userHasRole = (
  role: UserRole | undefined,
  allowedRoles: readonly UserRole[]
) => Boolean(role && allowedRoles.includes(role));

export const hasRole = (
  allowedRoles: readonly UserRole[],
  options?: { message?: string }
) => {
  return async (c: Context, next: Next) => {
    const payload = c.get("jwtPayload") as { role?: string; unitId?: string };
    const userRole = payload?.role as UserRole | undefined;

    if (!userHasRole(userRole, allowedRoles)) {
      return c.json(
        { success: false, error: options?.message ?? "Forbidden: Insufficient permissions" },
        403
      );
    }
    await next();
  };
};

export const hasUnitAccess = () => {
  return async (c: Context, next: Next) => {
    const payload = c.get("jwtPayload") as { role?: string; unitId?: string };
    const userRole = payload?.role as UserRole | undefined;
    const userUnitId = payload?.unitId;

    // Sysadmin and Superadmin have global access
    if (userRole === "sysadmin" || userRole === "superadmin") {
      await next();
      return;
    }

    // Admins are scoped to their unitId
    const requestedUnitId = c.req.param("unitId") || c.req.query("unitId");

    if (requestedUnitId && userUnitId !== requestedUnitId) {
      return c.json({ success: false, error: "Forbidden: Unit access denied" }, 403);
    }

    await next();
  };
};
