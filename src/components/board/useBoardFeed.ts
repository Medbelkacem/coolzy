"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderDTO } from "@/lib/orders";

export type FeedState = "live" | "offline" | "polling";

/**
 * Keeps the board's order map in sync with the server: SSE first, plain
 * polling after two consecutive stream failures, and a retry of the stream
 * every 30 s while polling. Optimistic local edits are kept until the server
 * sends a newer `updatedAt` for the same order.
 */
export function useBoardFeed(initial: OrderDTO[], onNew: (order: OrderDTO) => void) {
  const [orders, setOrders] = useState<Map<string, OrderDTO>>(() => new Map(initial.map((o) => [o.id, o])));
  const [state, setState] = useState<FeedState>("live");
  const known = useRef<Set<string>>(new Set(initial.map((o) => o.id)));
  const optimistic = useRef<Map<string, number>>(new Map()); // id → local updatedAt ms
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  const merge = useCallback((incoming: OrderDTO[], replace: boolean) => {
    setOrders((prev) => {
      const next = replace ? new Map<string, OrderDTO>() : new Map(prev);
      if (replace) {
        // keep optimistic entries that the snapshot doesn't supersede
        for (const [id, o] of prev) if (optimistic.current.has(id)) next.set(id, o);
      }
      for (const o of incoming) {
        const localTs = optimistic.current.get(o.id);
        const serverTs = Date.parse(o.updatedAt);
        if (localTs !== undefined && serverTs < localTs) continue; // our optimistic version is newer; wait for the real update
        if (localTs !== undefined) optimistic.current.delete(o.id);
        next.set(o.id, o);
        if (!known.current.has(o.id)) {
          known.current.add(o.id);
          if (o.status === "RECEIVED") onNewRef.current(o);
        }
      }
      return next;
    });
  }, []);

  /** Apply a local change immediately; the server's later version wins. */
  const applyLocal = useCallback((order: OrderDTO) => {
    optimistic.current.set(order.id, Date.parse(order.updatedAt));
    setOrders((prev) => new Map(prev).set(order.id, order));
  }, []);
  const rollback = useCallback((order: OrderDTO) => {
    optimistic.current.delete(order.id);
    setOrders((prev) => new Map(prev).set(order.id, order));
  }, []);
  const confirm = useCallback((order: OrderDTO) => {
    optimistic.current.delete(order.id);
    setOrders((prev) => new Map(prev).set(order.id, order));
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    let errors = 0;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    };
    const poll = async () => {
      try {
        const res = await fetch("/api/board/orders", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { orders: OrderDTO[] };
        merge(json.orders, true);
        setState("polling");
      } catch {
        setState("offline");
      }
    };
    const startPolling = () => {
      if (pollTimer) return;
      void poll();
      pollTimer = setInterval(poll, 5000);
      retryTimer = setTimeout(() => {
        errors = 0;
        connect();
      }, 30_000);
    };
    const connect = () => {
      if (disposed) return;
      es?.close();
      es = new EventSource("/api/board/stream");
      es.addEventListener("snapshot", (e) => {
        errors = 0;
        stopPolling();
        setState("live");
        merge(JSON.parse((e as MessageEvent).data) as OrderDTO[], true);
      });
      es.addEventListener("order", (e) => {
        merge([JSON.parse((e as MessageEvent).data) as OrderDTO], false);
      });
      es.onopen = () => setState((s) => (s === "polling" ? s : "live"));
      es.onerror = () => {
        errors += 1;
        if (errors >= 2) {
          es?.close();
          es = null;
          startPolling();
        } else {
          setState("offline");
        }
      };
    };
    connect();
    return () => {
      disposed = true;
      es?.close();
      stopPolling();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [merge]);

  return { orders, state, applyLocal, rollback, confirm };
}
