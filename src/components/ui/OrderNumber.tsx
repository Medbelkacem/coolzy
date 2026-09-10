import { displayNumber } from "@/lib/order-flow";

/**
 * An order number such as #0142. Isolated so the "#" stays to the left of the
 * digits when the surrounding line runs right to left.
 */
export function OrderNumber({ n, className = "" }: { n: number | string; className?: string }) {
  const label = typeof n === "number" ? displayNumber(n) : n;
  return (
    <bdi dir="ltr" className={`tabular ${className}`.trim()}>
      {label}
    </bdi>
  );
}
