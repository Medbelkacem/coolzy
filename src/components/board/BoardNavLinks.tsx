"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function BoardNavLinks({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("nav");
  const tw = useTranslations("worker");
  const pathname = usePathname();
  const items = [
    { href: "/board", label: t("board") },
    { href: "/board/menu", label: tw("soldOut.navLabel") },
    { href: "/me/history", label: t("myHistory") },
    { href: "/me/payslips", label: t("myPayslips") },
    ...(isAdmin ? [{ href: "/admin", label: t("admin") }] : []),
  ];
  return (
    <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto" aria-label={t("board")}>
      {items.map((i) => {
        const active = i.href === "/board" ? pathname === "/board" : pathname.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} className={`min-h-[40px] whitespace-nowrap rounded-[var(--radius-pill)] px-3 text-sm leading-[40px] xfade ${active ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
