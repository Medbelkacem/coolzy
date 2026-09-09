"use client";
import { useTranslations } from "next-intl";
import type { OrderDTO } from "@/lib/orders";
import { nextStatus } from "@/lib/order-flow";
import { formatPhone } from "@/lib/phone";
import { IconTable, IconBike, IconClock } from "@/components/ui/Icons";

export function elapsedMinutes(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(iso)) / 60000));
}
export function elapsedTone(min: number): "neutral" | "warn" | "stop" {
  return min >= 15 ? "stop" : min >= 8 ? "warn" : "neutral";
}

export function OrderCard({
  order,
  now,
  pending,
  flash,
  onAdvance,
  onCancel,
}: {
  order: OrderDTO;
  now: number;
  pending: boolean;
  flash: boolean;
  onAdvance: (order: OrderDTO, to: OrderDTO["status"]) => void;
  onCancel: (order: OrderDTO) => void;
}) {
  const t = useTranslations("board");
  const min = elapsedMinutes(order.createdAt, now);
  const next = nextStatus(order.type, order.status);
  const label =
    next === "APPROVED" ? t("accept") : next === "PREPARING" ? t("start") : next === "READY" ? t("markReady") : next === "COMPLETED" ? t("handed") : next === "DELIVERED" ? t("delivered") : null;

  return (
    <article className={`board-card ${flash ? "flash-once" : ""}`} data-pending={pending} data-accent={order.type === "DELIVERY" ? "curacao" : "colada"} aria-busy={pending} aria-labelledby={`o-${order.id}`}>
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span id={`o-${order.id}`} className="board-number">{order.display}</span>
          <span className="chip">
            {order.type === "TABLE" ? <IconTable width={16} height={16} /> : <IconBike width={16} height={16} />}
            {order.type === "TABLE" ? t("tableChip", { n: order.tableNumber ?? 0 }) : t("deliveryChip")}
          </span>
        </div>
        <span className="board-elapsed" data-tone={elapsedTone(min)} aria-label={t("elapsedLabel")}>
          <IconClock width={16} height={16} />
          {t("elapsed", { minutes: min })}
        </span>
      </header>

      <ul className="board-items">
        {order.items.map((it) => (
          <li key={it.id} className="board-item">
            <b>{it.qty}×</b>
            {it.name}
            {it.note ? <span className="board-item-note">“{it.note}”</span> : null}
          </li>
        ))}
      </ul>

      {order.note ? (
        <p className="board-note">
          <span className="text-[var(--fg-muted)]">{t("customerNote")}: </span>
          {order.note}
        </p>
      ) : null}

      {order.type === "DELIVERY" ? (
        <div className="board-meta">
          <div>{t("deliveryTo")}: {order.customerName}</div>
          <div dir="ltr" className="inline-block">{t("phone")}: {formatPhone(order.customerPhone)}</div>
          <div>{order.address}{order.landmark ? ` — ${order.landmark}` : ""}</div>
        </div>
      ) : null}

      {order.handledBy ? <p className="board-meta">{t("handledBy", { name: order.handledBy.name })}</p> : null}

      <div className="board-actions">
        {next && label ? (
          <button type="button" className="btn btn-primary board-primary" disabled={pending} onClick={() => onAdvance(order, next)}>
            {label}
          </button>
        ) : null}
        <button type="button" className="btn btn-quiet board-cancel border-transparent" disabled={pending} onClick={() => onCancel(order)}>
          {t("cancel")}
        </button>
      </div>
    </article>
  );
}
