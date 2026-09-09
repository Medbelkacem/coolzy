import { getOrderByToken } from "@/lib/receipt";
import { toOrderDTO } from "@/lib/orders";
import { sseResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Live status for one order. The first tick always sends the current state. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const first = await getOrderByToken(token);
  if (!first) return new Response("Not found", { status: 404 });
  return sseResponse<number>({
    initialCursor: 0,
    intervalMs: 2000,
    maxMs: 55_000,
    signal: req.signal,
    async poll(cursor) {
      const order = await getOrderByToken(token);
      if (!order) return { cursor, events: [{ event: "gone", data: {} }] };
      const stamp = order.updatedAt.getTime();
      if (stamp === cursor) return { cursor, events: [] };
      return { cursor: stamp, events: [{ event: "order", data: toOrderDTO(order) }] };
    },
  });
}
