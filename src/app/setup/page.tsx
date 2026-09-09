import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { adminExists } from "@/lib/bootstrap";
import { Wordmark } from "@/components/ui/Wordmark";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const t = await getTranslations("setup");
  const done = await adminExists();
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="flex items-center justify-between">
        <Wordmark size={28} />
        <LanguageSwitch />
      </div>
      <h1 className="font-display text-2xl">{t("title")}</h1>
      {done ? (
        <div className="surface flex flex-col gap-4 p-6">
          <p>{t("alreadyDone")}</p>
          <Link href="/login" className="btn btn-primary">{t("goLogin")}</Link>
        </div>
      ) : (
        <>
          <p className="text-[var(--fg-muted)]">{t("intro")}</p>
          <SetupForm />
        </>
      )}
    </main>
  );
}
