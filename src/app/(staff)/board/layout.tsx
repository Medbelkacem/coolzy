import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { Wordmark } from "@/components/ui/Wordmark";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { IconLogout } from "@/components/ui/Icons";
import { logoutAction } from "../login/actions";
import { BoardNavLinks } from "@/components/board/BoardNavLinks";

export const dynamic = "force-dynamic";

/** Worker shell: the board and almost nothing else. */
export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePermission("board.read");
  const t = await getTranslations("nav");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b hairline bg-[var(--bg)] px-3 py-2 sm:px-4">
        <Link href="/board" className="shrink-0"><Wordmark size={22} /></Link>
        <BoardNavLinks isAdmin={actor.role === "ADMIN"} />
        <div className="ms-auto flex items-center gap-1">
          <span className="hidden truncate text-sm text-[var(--fg-muted)] md:inline">{actor.name ?? actor.username}</span>
          <LanguageSwitch />
          <form action={logoutAction}>
            <button type="submit" className="btn btn-quiet btn-icon" aria-label={t("logout")}><IconLogout width={18} height={18} /></button>
          </form>
        </div>
      </header>
      <main id="main" className="flex-1 px-3 py-3 sm:px-4 sm:py-4">{children}</main>
    </div>
  );
}
