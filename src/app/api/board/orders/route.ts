import { requirePermission, authzResponse } from "@/lib/authz";
import { boardSnapshot } from "@/lib/board";

export const dynamic = "force-dynamic";

/** Polling fallback for the board when the event stream is unavailable. */
export async function GET() {
  try {
    await requirePermission("board.read");
  } catch (err) {
    const res = authzResponse(err);
    if (res) return res;
    throw err;
  }
  const orders = await boardSnapshot();
  return Response.json({ orders, at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
