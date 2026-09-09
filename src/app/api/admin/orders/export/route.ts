import { requirePermission, authzResponse } from "@/lib/authz";
import { iterateOrdersForExport, parseOrderFilters } from "@/lib/admin-queries";
import { displayNumber } from "@/lib/orders";
import { dayKey, fmtDateTime } from "@/lib/time";
import { formatPhone } from "@/lib/customer";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const SEP = ";";
function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per order item, order columns repeated. UTF-8 with BOM, ';' separated (Excel FR). */
export async function GET(req: Request) {
  try {
    const actor = await requirePermission("orders.export");
    const url = new URL(req.url);
    const filters = parseOrderFilters(Object.fromEntries(url.searchParams));
    await audit(actor.id, "orders.export", "Order", null, filters);
    const header = ["order", "date", "type", "table", "status", "customer", "phone", "address", "landmark", "worker", "product", "qty", "unit_price", "line_total", "item_note", "order_note", "subtotal", "delivery_fee", "total", "cancel_reason"];
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode("\uFEFF" + header.join(SEP) + "\r\n"));
        for await (const o of iterateOrdersForExport(filters)) {
          const base = [displayNumber(o.number), fmtDateTime(o.createdAt, "fr"), o.type, o.tableNumber ?? "", o.status, o.customerName ?? "", o.customerPhone ? formatPhone(o.customerPhone) : "", o.address ?? "", o.landmark ?? "", o.handledBy?.name ?? ""];
          const tail = [o.note ?? "", o.subtotal, o.deliveryFee, o.total, o.cancelReason ?? ""];
          for (const i of o.items) {
            controller.enqueue(encoder.encode([...base, i.nameSnapshot, i.qty, i.unitPrice, i.unitPrice * i.qty, i.note ?? "", ...tail].map(cell).join(SEP) + "\r\n"));
          }
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="coolzy-orders-${dayKey()}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return authzResponse(err) ?? new Response("Error", { status: 500 });
  }
}
