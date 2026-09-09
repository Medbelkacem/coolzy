/**
 * Server-Sent Events on a serverless runtime: the handler polls the database
 * on a short interval and pushes changes, then closes before the platform
 * timeout so the browser's EventSource reconnects cleanly. Clients fall back
 * to plain polling if the stream fails twice in a row.
 */
export function sseResponse<C>(opts: {
  initialCursor: C;
  poll: (cursor: C) => Promise<{ cursor: C; events: { event: string; data: unknown }[] }>;
  intervalMs?: number;
  maxMs?: number;
  signal?: AbortSignal;
}): Response {
  const encoder = new TextEncoder();
  const interval = opts.intervalMs ?? 2000;
  const maxMs = opts.maxMs ?? 55_000;
  let cursor = opts.initialCursor;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const started = Date.now();
      const write = (s: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          closed = true;
        }
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        if (timer) clearTimeout(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      opts.signal?.addEventListener("abort", finish);
      write("retry: 1500\n\n");
      const tick = async () => {
        if (closed) return;
        try {
          const r = await opts.poll(cursor);
          cursor = r.cursor;
          for (const e of r.events) write(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);
          if (r.events.length === 0) write(": ping\n\n");
        } catch (err) {
          console.error("sse poll", err);
          write(`event: error\ndata: {}\n\n`);
        }
        if (Date.now() - started > maxMs) return finish();
        timer = setTimeout(tick, interval);
      };
      await tick();
    },
    cancel() {
      closed = true;
      if (timer) clearTimeout(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
