import { getOrderByToken } from "@/lib/receipt";
import { toOrderDTO } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Polling fallback for the tracking page. Public by token. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) return Response.json({ error: "notFound" }, { status: 404 });
  return Response.json(toOrderDTO(order), { headers: { "Cache-Control": "no-store" } });
}
