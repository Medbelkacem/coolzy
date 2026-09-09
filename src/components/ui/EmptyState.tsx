import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Every empty list in the product goes through this: a title, one sentence
 * that says what to do next, and at most one primary action.
 */
export function EmptyState({
  title,
  body,
  action,
  icon,
  compact = false,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string } | ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`surface flex flex-col items-center text-center ${compact ? "gap-2 px-5 py-8" : "gap-3 px-6 py-14"}`}>
      {icon ? <div className="text-[var(--fg-muted)]">{icon}</div> : null}
      <h2 className={`font-display ${compact ? "text-lg" : "text-xl"}`}>{title}</h2>
      {body ? <p className="measure text-[var(--fg-muted)]">{body}</p> : null}
      {action && typeof action === "object" && "href" in (action as object) ? (
        <Link href={(action as { href: string }).href} className="btn btn-primary mt-2">
          {(action as { label: string }).label}
        </Link>
      ) : (
        (action as ReactNode)
      )}
    </div>
  );
}
