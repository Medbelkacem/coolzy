"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { OrderDTO } from "@/lib/orders";
import { formatDA } from "@/lib/money";
import { fmtTime } from "@/lib/time";
import { StatusChip } from "@/components/ui/StatusChip";
import { IconBell, IconBellOff } from "@/components/ui/Icons";
import { advanceOrder, cancelOrder } from "@/app/(staff)/board/actions";
import { useBoardFeed } from "./useBoardFeed";
import { OrderCard } from "./OrderCard";
import { CancelSheet } from "./CancelSheet";
import { isChimeUnlocked, playChime, unlockChime } from "./chime";

const MUTE_KEY = "coolzy-board-muted";
const TERMINAL_SET = new Set(["COMPLETED", "DELIVERED", "CANCELLED"]);

export function Board({ initial }: { initial: OrderDTO[] }) {
  const t = useTranslations("board");
  const locale = useLocale();
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [cancelling, setCancelling] = useState<OrderDTO | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const mutedRef = useRef(false);

  const onNew = useCallback((o: OrderDTO) => {
    setFlashIds((s) => new Set(s).add(o.id));
    setTimeout(() => setFlashIds((s) => { const n = new Set(s); n.delete(o.id); return n; }), 1200);
    setAnnounce(t("newOrderAnnounce", { number: o.displayBidi }));
    if (!mutedRef.current) playChime();
  }, [t]);

  const { orders, state, applyLocal, rollback, confirm } = useBoardFeed(initial, onNew);

  // clock for elapsed minutes
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // mute preference + sound unlock on first gesture
  useEffect(() => {
    try {
      const m = localStorage.getItem(MUTE_KEY) === "1";
      setMuted(m);
      mutedRef.current = m;
    } catch { /* ignore */ }
    const unlock = () => {
      if (unlockChime()) setSoundReady(true);
      // some browsers resume asynchronously
      setTimeout(() => setSoundReady(isChimeUnlocked()), 300);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    mutedRef.current = m;
    try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch { /* ignore */ }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const setPending = (id: string, on: boolean) =>
    setPendingIds((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });

  const advance = async (order: OrderDTO, to: OrderDTO["status"]) => {
    const optimistic: OrderDTO = { ...order, status: to, updatedAt: new Date().toISOString() };
    applyLocal(optimistic);
    setPending(order.id, true);
    const res = await advanceOrder({ orderId: order.id, to });
    setPending(order.id, false);
    if (res.ok) confirm(res.data);
    else {
      rollback(order);
      showToast(t("actionFailed"));
    }
  };

  const cancel = async (order: OrderDTO, reason: string) => {
    setCancelling(null);
    const optimistic: OrderDTO = { ...order, status: "CANCELLED", cancelReason: reason, updatedAt: new Date().toISOString() };
    applyLocal(optimistic);
    setPending(order.id, true);
    const res = await cancelOrder({ orderId: order.id, reason });
    setPending(order.id, false);
    if (res.ok) confirm(res.data);
    else {
      rollback(order);
      showToast(t("actionFailed"));
    }
  };

  const list = useMemo(() => [...orders.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)), [orders]);
  const cols = {
    new: list.filter((o) => o.status === "RECEIVED"),
    preparing: list.filter((o) => o.status === "APPROVED" || o.status === "PREPARING"),
    ready: list.filter((o) => o.status === "READY"),
  };
  const recent = list.filter((o) => TERMINAL_SET.has(o.status)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const activeCount = cols.new.length + cols.preparing.length + cols.ready.length;

  const column = (key: "new" | "preparing" | "ready", items: OrderDTO[]) => (
    <section className="board-col" aria-labelledby={`col-${key}`}>
      <div className="board-col-head">
        <h2 id={`col-${key}`} className="font-display text-lg">{t(key)}</h2>
        <span className="text-sm text-[var(--fg-muted)] tabular">{t("ordersCount", { count: items.length })}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed hairline px-4 py-6 text-center text-sm text-[var(--fg-muted)]">{t("columnEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((o) => (
            <OrderCard key={o.id} order={o} now={now} pending={pendingIds.has(o.id)} flash={flashIds.has(o.id)} onAdvance={advance} onCancel={setCancelling} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl">{t("title")}</h1>
          <span className="board-live" data-state={state} role="status">
            <span className="board-live-dot" aria-hidden="true" />
            {state === "live" ? t("live") : state === "polling" ? t("polling") : t("offline")}
          </span>
        </div>
        <button type="button" className="btn btn-quiet btn-sm" aria-pressed={muted} onClick={toggleMute}>
          {muted ? <IconBellOff width={16} height={16} /> : <IconBell width={16} height={16} />}
          {muted ? t("unmute") : t("mute")}
        </button>
      </div>

      <p className="sr-only" aria-live="polite">{announce}</p>

      {activeCount === 0 ? (
        <div className="surface flex flex-col items-center gap-2 px-6 py-14 text-center">
          <h2 className="font-display text-xl">{t("emptyTitle")}</h2>
          <p className="measure text-[var(--fg-muted)]">{t("emptyBody")}</p>
        </div>
      ) : null}

      <div className="board-grid">
        {column("new", cols.new)}
        {column("preparing", cols.preparing)}
        {column("ready", cols.ready)}
      </div>

      <section aria-labelledby="recent-h" className="mt-2">
        <h2 id="recent-h" className="mb-2 text-sm text-[var(--fg-muted)]">{t("recent")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">{t("recentEmpty")}</p>
        ) : (
          <div className="board-recent">
            {recent.map((o) => (
              <div key={o.id} className="board-recent-card">
                <div className="flex items-center justify-between gap-2">
                  <bdi dir="ltr" className="font-medium tabular">{o.display}</bdi>
                  <StatusChip status={o.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[var(--fg-muted)]">
                  <span>{t("items", { count: o.items.reduce((s, i) => s + i.qty, 0) })}</span>
                  <span className="tabular">{formatDA(o.total, locale as "fr" | "en" | "ar")}</span>
                  <span className="tabular">{fmtTime(new Date(o.updatedAt), locale)}</span>
                </div>
                {o.cancelReason ? <div className="mt-1 text-[var(--color-stop)]">{t("reasonLabel")}: {o.cancelReason}</div> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {cancelling ? <CancelSheet order={cancelling} onClose={() => setCancelling(null)} onConfirm={(r) => cancel(cancelling, r)} /> : null}
      {toast ? <div className="board-toast" role="alert">{toast}</div> : null}
      {!soundReady && !muted ? <div className="board-toast" data-kind="hint" role="status">{t("soundHint")}</div> : null}
    </div>
  );
}
