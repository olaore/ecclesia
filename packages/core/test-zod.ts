import { z } from "zod";

const schema = z.object({ dateJoined: z.date() });
try {
  schema.parse({ dateJoined: "2023-01-01T00:00:00.000Z" });
  console.log("Success");
} catch (e) {
  console.log("Error:", e.errors);
}
