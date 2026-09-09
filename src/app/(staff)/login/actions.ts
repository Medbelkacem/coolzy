"use server";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export async function loginAction(_prev: { error: string | null } | null, form: FormData): Promise<{ error: string | null }> {
  const next = String(form.get("next") ?? "");
  const redirectTo = next.startsWith("/") && !next.startsWith("//") ? next : "/after-login";
  try {
    await signIn("credentials", { login: form.get("login"), password: form.get("password"), redirectTo });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) return { error: "invalid" };
    throw err; // NEXT_REDIRECT
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
