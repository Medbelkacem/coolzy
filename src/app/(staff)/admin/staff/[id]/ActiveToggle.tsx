"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setStaffActive } from "../actions";
import { ErrorText } from "@/components/ui/ErrorText";

export function ActiveToggle({ id, active, isSelf }: { id: string; active: boolean; isSelf: boolean }) {
  const t = useTranslations("staff");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (isSelf && active) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={active ? "btn btn-danger" : "btn btn-quiet"}
        disabled={pending}
        onClick={() => {
          if (active && !window.confirm(t("deactivateConfirm"))) return;
          setError(null);
          start(async () => {
            const r = await setStaffActive(id, !active);
            if (!r.ok) setError(r.error);
          });
        }}
      >
        {active ? t("deactivate") : t("reactivate")}
      </button>
      <ErrorText error={error} />
    </div>
  );
}
