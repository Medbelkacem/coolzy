import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Wordmark } from "@/components/ui/Wordmark";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations("auth");
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="flex items-center justify-between">
        <Wordmark size={28} />
        <LanguageSwitch />
      </div>
      <div>
        <h1 className="font-display text-2xl">{t("title")}</h1>
        <p className="mt-1 text-[var(--fg-muted)]">{t("subtitle")}</p>
      </div>
      <LoginForm next={sp.next ?? ""} expired={sp.expired === "1"} />
      <Link href="/" className="self-start text-sm text-[var(--fg-muted)] underline-offset-4 hover:underline">{t("backToMenu")}</Link>
    </main>
  );
}
