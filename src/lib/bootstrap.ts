import { db } from "./db";

/** True once any admin exists — the /setup route disables itself on this. */
export async function adminExists(): Promise<boolean> {
  const n = await db().user.count({ where: { role: "ADMIN" } });
  return n > 0;
}
