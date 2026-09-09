import { ForbiddenError, UnauthenticatedError } from "./errors";

/**
 * Every server action returns one of these. `error` is a message key under the
 * `errors` namespace (e.g. "forbidden") so the UI can render it in the user's
 * language; `fieldErrors` map a form field to such a key.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorKey; fieldErrors?: Record<string, ErrorKey> };

export type ErrorKey =
  | "generic"
  | "forbidden"
  | "unauthenticated"
  | "invalid"
  | "notFound"
  | "rateLimited"
  | "shopClosed"
  | "deliveryClosed"
  | "tableInvalid"
  | "tableCountUnset"
  | "productUnavailable"
  | "emptyCart"
  | "phoneInvalid"
  | "otpInvalid"
  | "otpExpired"
  | "transitionInvalid"
  | "reasonRequired"
  | "usernameTaken"
  | "emailTaken"
  | "passwordWeak"
  | "photoInvalid"
  | "photoTooLarge"
  | "reviewWindowClosed"
  | "reviewNotAllowed"
  | "slugTaken"
  | "hasProducts"
  | "selfDeactivate"
  | "conflict";

export const ok = <T = undefined>(data?: T): ActionResult<T> => ({ ok: true, data: data as T });
export const fail = <T = undefined>(error: ErrorKey, fieldErrors?: Record<string, ErrorKey>): ActionResult<T> => ({
  ok: false,
  error,
  fieldErrors,
});

/** Wrap an action body so authz/validation errors become typed results. */
export async function guarded<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof UnauthenticatedError) return fail("unauthenticated");
    if (err instanceof ForbiddenError) return fail("forbidden");
    if (err instanceof ActionError) return fail(err.key, err.fieldErrors);
    console.error(err);
    return fail("generic");
  }
}

export class ActionError extends Error {
  constructor(public key: ErrorKey, public fieldErrors?: Record<string, ErrorKey>) {
    super(key);
  }
}
