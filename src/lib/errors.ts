export class ForbiddenError extends Error {
  status = 403 as const;
  constructor(permission: string) {
    super(`Forbidden: ${permission}`);
  }
}
export class UnauthenticatedError extends Error {
  status = 401 as const;
  constructor() {
    super("Unauthenticated");
  }
}
