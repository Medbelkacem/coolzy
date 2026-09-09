"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * Registers the service worker and, from the second visit on, offers the
 * install prompt once. Dismissal is remembered.
 */
export function PwaRegister() {
  const t = useTranslations("pwa");
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    let visits = 0;
    try {
      visits = Number(localStorage.getItem("coolzy-visits") ?? "0") + 1;
      localStorage.setItem("coolzy-visits", String(visits));
    } catch {
      /* storage unavailable */
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      let dismissed = false;
      try {
        dismissed = localStorage.getItem("coolzy-install-dismissed") === "1";
      } catch {
        /* ignore */
      }
      if (visits >= 2 && !dismissed) {
        setDeferred(e as BIPEvent);
        setShow(true);
      }
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show || !deferred) return null;
  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem("coolzy-install-dismissed", "1");
    } catch {
      /* ignore */
    }
  };
  return (
    <div role="dialog" aria-label={t("installTitle")} className="sheet-up fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-[var(--radius-card)] border hairline bg-[var(--bg-raised)] p-4 shadow-[0_12px_40px_rgba(0,0,0,.35)] safe-bottom">
      <p className="font-display text-lg">{t("installTitle")}</p>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">{t("installBody")}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-primary" onClick={async () => { await deferred.prompt(); setShow(false); }}>{t("install")}</button>
        <button type="button" className="btn btn-quiet" onClick={dismiss}>{t("notNow")}</button>
      </div>
    </div>
  );
}
