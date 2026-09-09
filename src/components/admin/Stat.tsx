import type { ReactNode } from "react";

/** A quiet KPI tile. The period is always stated by the caller. */
export function Stat({ label, value, hint, tone = "neutral" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "neutral" | "ok" | "warn" | "stop" }) {
  const color = tone === "ok" ? "text-[var(--color-ok)]" : tone === "warn" ? "text-[var(--color-warn)]" : tone === "stop" ? "text-[var(--color-stop)]" : "text-[var(--fg-muted)]";
  return (
    <div className="surface flex flex-col gap-1 p-4">
      <p className="text-sm text-[var(--fg-muted)]">{label}</p>
      <p className="font-display text-2xl leading-none tabular">{value}</p>
      {hint ? <p className={`text-sm ${color}`}>{hint}</p> : null}
    </div>
  );
}
