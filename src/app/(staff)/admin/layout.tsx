import { requireRole } from "@/lib/authz";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireRole("ADMIN");
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AdminNav userName={actor.name ?? actor.username} logout={logoutAction} />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
