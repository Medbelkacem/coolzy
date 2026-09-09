"use client";
import { useLocale, useTranslations } from "next-intl";
import type { OrderDTO } from "@/lib/orders";
import { fmtTime } from "@/lib/time";
import { IconCheck, IconX } from "@/components/ui/Icons";

type Row = { status: OrderDTO["status"]; at: string | null; state: "done" | "current" | "todo" | "cancelled"; reason?: string | null };

export function buildTimeline(order: OrderDTO, flow: OrderDTO["status"][]): Row[] {
  const eventFor = (s: OrderDTO["status"]) => order.events.find((e) => e.status === s) ?? null;
  if (order.status === "CANCELLED") {
    const cancel = eventFor("CANCELLED");
    const rows: Row[] = [];
    for (const s of flow) {
      const ev = eventFor(s);
      if (!ev) break;
      rows.push({ status: s, at: ev.at, state: "done" });
    }
    rows.push({ status: "CANCELLED", at: cancel?.at ?? null, state: "cancelled", reason: cancel?.reason ?? order.cancelReason });
    return rows;
  }
  const idx = flow.indexOf(order.status);
  return flow.map((s, i) => ({ status: s, at: eventFor(s)?.at ?? null, state: i < idx ? "done" : i === idx ? "current" : "todo" }));
}

export function Timeline({ order, flow }: { order: OrderDTO; flow: OrderDTO["status"][] }) {
  const t = useTranslations("receipt");
  const locale = useLocale();
  const rows = buildTimeline(order, flow);
  return (
    <ol className="timeline" aria-label={t("timeline")}>
      {rows.map((row, i) => {
        const last = i === rows.length - 1;
        return (
          <li key={row.status} className="contents">
            <div className="flex flex-col items-center">
              <span className="timeline-dot xfade" data-state={row.state} aria-hidden="true">
                {row.state === "done" || row.state === "current" ? <IconCheck width={14} height={14} strokeWidth={2.5} /> : row.state === "cancelled" ? <IconX width={14} height={14} strokeWidth={2.5} /> : null}
              </span>
              {!last ? <span className="timeline-line" data-state={row.state === "done" ? "done" : "todo"} aria-hidden="true" /> : null}
            </div>
            <div className={`pb-4 ${row.state === "todo" ? "text-[var(--fg-muted)]" : ""}`} aria-current={row.state === "current" ? "step" : undefined}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={row.state === "current" ? "font-medium" : ""}>{t(`steps.${row.status}`)}</span>
                {row.at ? <time dateTime={row.at} className="tabular text-sm text-[var(--fg-muted)]">{fmtTime(new Date(row.at), locale)}</time> : null}
              </div>
              {row.state === "current" || row.state === "cancelled" ? <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{t(`hint.${row.status}`)}</p> : null}
              {row.state === "cancelled" ? <p className="mt-0.5 text-sm">{t("cancelledReason", { reason: row.reason || t("noReason") })}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
