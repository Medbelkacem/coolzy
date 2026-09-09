import { requirePermission, authzResponse } from "@/lib/authz";
import { sseResponse } from "@/lib/sse";
import { boardSnapshot, boardChangesSince, maxUpdatedAt } from "@/lib/board";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Live board feed: a snapshot on connect, then every order touched since the cursor. */
export async function GET(req: Request) {
  try {
    await requirePermission("board.read");
  } catch (err) {
    const res = authzResponse(err);
    if (res) return res;
    throw err;
  }
  let first = true;
  return sseResponse<Date>({
    initialCursor: new Date(),
    intervalMs: 2000,
    maxMs: 55_000,
    signal: req.signal,
    async poll(cursor) {
      if (first) {
        first = false;
        const snapshot = await boardSnapshot();
        return { cursor: maxUpdatedAt(snapshot, cursor), events: [{ event: "snapshot", data: snapshot }] };
      }
      const changed = await boardChangesSince(cursor);
      return { cursor: maxUpdatedAt(changed, cursor), events: changed.map((o) => ({ event: "order", data: o })) };
    },
  });
}
