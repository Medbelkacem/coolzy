import { useTranslations } from "next-intl";
import type { OrderStatus } from "@/generated/prisma/enums";

const tone: Record<OrderStatus, string> = {
  RECEIVED: "bg-[color-mix(in_srgb,var(--fg)_8%,transparent)]",
  APPROVED: "bg-[color-mix(in_srgb,var(--color-curacao)_18%,transparent)]",
  PREPARING: "bg-[color-mix(in_srgb,var(--color-colada)_22%,transparent)]",
  READY: "bg-[color-mix(in_srgb,var(--color-ok)_20%,transparent)]",
  DELIVERED: "bg-[color-mix(in_srgb,var(--color-ok)_20%,transparent)]",
  COMPLETED: "bg-[color-mix(in_srgb,var(--color-ok)_20%,transparent)]",
  CANCELLED: "bg-[color-mix(in_srgb,var(--color-stop)_16%,transparent)]",
};

/** Order status chip. Cross-fades via .xfade when the status prop changes. */
export function StatusChip({ status, className = "" }: { status: OrderStatus; className?: string }) {
  const t = useTranslations("status");
  return (
    <span className={`chip xfade border-transparent ${tone[status]} ${className}`} data-status={status}>
      {t(status)}
    </span>
  );
}
