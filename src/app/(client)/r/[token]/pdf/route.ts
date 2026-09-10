import { getOrderByToken } from "@/lib/receipt";
import { displayNumber } from "@/lib/orders";
import { launchBrowser } from "@/lib/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Renders the paper view to an 80 mm-wide PDF with real Arabic shaping (headless Chromium). */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) return new Response("Not found", { status: 404 });
  // On Vercel the public origin is authoritative; locally the request origin is (any port).
  const base = process.env.VERCEL ? process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin : new URL(req.url).origin;
  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 320, height: 800, deviceScaleFactor: 2 });
    await page.goto(`${base}/r/${token}/print?pdf=1`, { waitUntil: "networkidle0", timeout: 30_000 });
    await page.addStyleTag({ content: "html, body, [data-world] { background: #fff !important; }" });
    await page.evaluate(() => (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready);
    const heightPx = await page.evaluate(() => (document.querySelector(".print-page") as HTMLElement | null)?.scrollHeight ?? document.body.scrollHeight);
    const heightMm = Math.ceil((heightPx * 25.4) / 96) + 16;
    const pdf = await page.pdf({ width: "80mm", height: `${heightMm}mm`, printBackground: true, margin: { top: "3mm", right: "3mm", bottom: "3mm", left: "3mm" } });
    const name = `coolzy-${displayNumber(order.number).slice(1)}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("pdf render failed", err);
    return new Response("PDF temporarily unavailable. Use Print.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } finally {
    await browser?.close().catch(() => {});
  }
}
