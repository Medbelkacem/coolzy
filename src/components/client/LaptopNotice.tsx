"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconX } from "@/components/ui/Icons";

/** Shown only between 16:00 and 20:00 Algiers time (decided by the server). Dismissed for the session. */
export function LaptopNotice({ text }: { text: string }) {
  const t = useTranslations("menu");
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem("coolzy-laptop-notice") === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden) return null;
  return (
    <div className="notice" role="status">
      <span className="flex-1">{text}</span>
      <button
        type="button"
        className="btn btn-quiet btn-icon"
        aria-label={t("dismiss")}
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem("coolzy-laptop-notice", "1");
          } catch {
            /* ignore */
          }
        }}
      >
        <IconX width={16} height={16} />
      </button>
    </div>
  );
}
