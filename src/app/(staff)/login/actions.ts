"use server";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { LOGIN_LIMIT, LOGIN_WINDOW_SECONDS } from "@/lib/login-limit";

export async function loginAction(_prev: { error: string | null } | null, form: FormData): Promise<{ error: string | null }> {
  const next = String(form.get("next") ?? "");
  const redirectTo = next.startsWith("/") && !next.startsWith("//") ? next : "/after-login";
  try {
    await signIn("credentials", { login: form.get("login"), password: form.get("password"), redirectTo });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      // The attempt was already counted inside authorize(); read the window so a
      // locked out barista is told to wait rather than doubting their password.
      const login = String(form.get("login") ?? "").trim().toLowerCase();
      const limited = login ? await isRateLimited(`login:${login}`, LOGIN_LIMIT, LOGIN_WINDOW_SECONDS) : false;
      return { error: limited ? "rateLimited" : "invalid" };
    }
    throw err; // NEXT_REDIRECT
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
