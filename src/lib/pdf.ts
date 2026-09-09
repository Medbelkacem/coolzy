import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Finds a Chromium binary: @sparticuz/chromium on Vercel, otherwise CHROME_PATH
 * or the Playwright-installed Chromium for local development.
 */
export async function launchBrowser() {
  const puppeteer = (await import("puppeteer-core")).default;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const executablePath = process.env.CHROME_PATH || findPlaywrightChromium();
  if (!executablePath) throw new Error("No Chromium found. Set CHROME_PATH.");
  return puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
}

function findPlaywrightChromium(): string | null {
  const root = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    for (const sub of ["chrome-linux64/chrome", "chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]) {
      const p = join(root, d, sub);
      if (existsSync(p)) return p;
    }
  }
  return null;
}
