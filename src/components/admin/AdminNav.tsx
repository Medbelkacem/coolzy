"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/ui/Wordmark";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { IconSun, IconGrid, IconList, IconUsers, IconWallet, IconChart, IconStar, IconSettings, IconBoard, IconLogout, IconX } from "@/components/ui/Icons";

type Item = { href: string; key: "overview" | "catalogue" | "orders" | "staff" | "expenses" | "stats" | "reviews" | "settings" | "board"; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> };
const ITEMS: Item[] = [
  { href: "/admin", key: "overview", icon: IconSun },
  { href: "/admin/menu", key: "catalogue", icon: IconGrid },
  { href: "/admin/orders", key: "orders", icon: IconList },
  { href: "/admin/staff", key: "staff", icon: IconUsers },
  { href: "/admin/expenses", key: "expenses", icon: IconWallet },
  { href: "/admin/stats", key: "stats", icon: IconChart },
  { href: "/admin/reviews", key: "reviews", icon: IconStar },
  { href: "/admin/settings", key: "settings", icon: IconSettings },
  { href: "/board", key: "board", icon: IconBoard },
];

/**
 * Left sidebar on desktop; on mobile a top bar with a button that opens the
 * same list as a bottom sheet. One component, one source of truth.
 */
export function AdminNav({ userName, logout }: { userName: string; logout: () => Promise<void> }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const current = ITEMS.find((i) => isActive(i.href));

  const list = (
    <ul className="flex flex-col gap-0.5">
      {ITEMS.map(({ href, key, icon: Icon }) => {
        const active = isActive(href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-[15px] xfade ${active ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--fg)] hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]"}`}
            >
              <Icon width={18} height={18} />
              <span>{t(key)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const footer = (
    <div className="flex flex-col gap-3 border-t hairline pt-4">
      <p className="truncate px-1 text-sm text-[var(--fg-muted)]">{t("signedInAs", { name: userName })}</p>
      <div className="flex items-center justify-between gap-2">
        <LanguageSwitch />
        <form action={logout}>
          <button type="submit" className="btn btn-quiet btn-sm" aria-label={t("logout")}>
            <IconLogout width={16} height={16} />
            <span className="hidden sm:inline">{t("logout")}</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:gap-6 lg:border-e lg:hairline lg:px-4 lg:py-6 lg:sticky lg:top-0 lg:h-dvh">
        <Link href="/admin" className="px-2"><Wordmark size={26} /></Link>
        <nav aria-label={t("admin")} className="flex-1">{list}</nav>
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b hairline bg-[var(--bg)] px-4 py-2 lg:hidden">
        <Link href="/admin"><Wordmark size={22} /></Link>
        <span className="truncate text-sm text-[var(--fg-muted)]">{current ? t(current.key) : ""}</span>
        <button type="button" className="btn btn-quiet btn-sm" aria-expanded={open} aria-controls="admin-sheet" onClick={() => setOpen(true)}>
          <IconGrid width={18} height={18} />
          <span>{t("openMenu")}</span>
        </button>
      </header>

      {/* Mobile bottom sheet */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("admin")}>
          <button type="button" className="absolute inset-0 bg-[rgba(14,12,11,.5)]" aria-label={t("openMenu")} onClick={() => setOpen(false)} />
          <div id="admin-sheet" className="sheet-up absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[var(--radius-card)] bg-[var(--bg)] p-4 safe-bottom">
            <div className="mb-3 flex items-center justify-between">
              <Wordmark size={22} />
              <button type="button" className="btn btn-quiet btn-icon" aria-label={t("openMenu")} onClick={() => setOpen(false)}><IconX /></button>
            </div>
            <nav aria-label={t("admin")}>{list}</nav>
            <div className="mt-4">{footer}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
