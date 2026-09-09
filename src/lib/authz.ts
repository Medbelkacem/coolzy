import type { Role } from "@/generated/prisma/enums";
import { auth } from "@/auth";
import { can, type Actor, type Permission } from "./permissions";
import { ForbiddenError, UnauthenticatedError } from "./errors";

export { PERMISSIONS, can, type Actor, type Permission } from "./permissions";
export { ForbiddenError, UnauthenticatedError } from "./errors";

export async function currentActor(): Promise<Actor> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: session.user.role, username: session.user.username, name: session.user.name };
}

/** Throws 401/403. Use at the top of every action and route handler. */
export async function requirePermission(permission: Permission): Promise<NonNullable<Actor>> {
  const actor = await currentActor();
  if (!actor) throw new UnauthenticatedError();
  if (!can(actor, permission)) throw new ForbiddenError(permission);
  return actor;
}

export async function requireRole(...roles: Role[]): Promise<NonNullable<Actor>> {
  const actor = await currentActor();
  if (!actor) throw new UnauthenticatedError();
  if (!roles.includes(actor.role)) throw new ForbiddenError(roles.join("|"));
  return actor;
}

/** Route-handler helper: turns authz errors into HTTP responses. */
export function authzResponse(err: unknown): Response | null {
  if (err instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
  if (err instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
  return null;
}
