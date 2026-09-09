import { requirePermission } from "@/lib/authz";
import { boardSnapshot } from "@/lib/board";
import { Board } from "@/components/board/Board";
import "@/styles/board.css";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  await requirePermission("board.read");
  const initial = await boardSnapshot();
  return <Board initial={initial} />;
}
