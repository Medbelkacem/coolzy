import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

/** Admin actions on staff and money are logged. Never throws. */
export async function audit(actorId: string | null, action: string, entity: string, entityId?: string | null, data?: Prisma.InputJsonValue) {
  try {
    await db().auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, data } });
  } catch (err) {
    console.error("audit failed", err);
  }
}
