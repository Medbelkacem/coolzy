"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { OrderDTO } from "@/lib/orders";
import { StatusChip } from "@/components/ui/StatusChip";
import { fmtDate, fmtTime } from "@/lib/time";
import { ReceiptBody, type ShopInfo } from "./ReceiptBody";
import { Timeline } from "./Timeline";

/**
 * Keeps the order fresh: SSE first, plain polling after two stream failures.
 * The customer never refreshes. Children (reviews) show once the order is done.
 */
export function ReceiptLive({ initial, shop, flow, children }: { initial: OrderDTO; shop: ShopInfo; flow: OrderDTO["status"][]; children?: ReactNode }) {
  const t = useTranslations("receipt");
  const locale = useLocale();
  const [order, setOrder] = useState(initial);
  const [live, setLive] = useState(true);
  const failures = useRef(0);
  const done = order.status === "COMPLETED" || order.status === "DELIVERED" || order.status === "CANCELLED";

  useEffect(() => {
    if (done) return;
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const startPolling = () => {
      if (poll) return;
      setLive(false);
      poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/r/${initial.token}`, { cache: "no-store" });
          if (r.ok) setOrder(await r.json());
        } catch {
          /* keep trying */
        }
      }, 5000);
    };
    const startStream = () => {
      if (stopped || typeof EventSource === "undefined") return startPolling();
      es = new EventSource(`/api/r/${initial.token}/stream`);
      es.addEventListener("order", (e) => {
        failures.current = 0;
        setLive(true);
        setOrder(JSON.parse((e as MessageEvent).data));
      });
      es.onerror = () => {
        failures.current += 1;
        if (failures.current >= 2) {
          es?.close();
          es = null;
          startPolling();
        }
      };
    };
    startStream();
    return () => {
      stopped = true;
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [initial.token, done]);

  // Stop polling once terminal.
  useEffect(() => {
    if (done) setLive(true);
  }, [done]);

  const created = new Date(order.createdAt);
  return (
    <>
      <section className="surface flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl leading-none">{order.display}</h1>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">{t("placedAt", { date: fmtDate(created, locale), time: fmtTime(created, locale) })}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusChip status={order.status} className="whitespace-nowrap" />
            {!done ? (
              <span className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)]" role="status">
                <span className="live-dot" data-live={live} aria-hidden="true" />
                {live ? t("live") : t("reconnecting")}
              </span>
            ) : null}
          </div>
        </div>
        <Timeline order={order} flow={flow} />
      </section>

      <section className="surface p-5">
        <ReceiptBody order={order} shop={shop} variant="screen" />
      </section>

      {order.status === "COMPLETED" || order.status === "DELIVERED" ? children : null}
    </>
  );
}
