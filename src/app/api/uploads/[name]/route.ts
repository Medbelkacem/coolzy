import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LOCAL_UPLOAD_DIR } from "@/lib/upload";

/** Local-development image serving only. Production uses Vercel Blob URLs. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9]{20}(-thumb)?\.webp$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(join(LOCAL_UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
