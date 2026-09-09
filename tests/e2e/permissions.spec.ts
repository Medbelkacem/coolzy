import { test, expect, type Page } from "@playwright/test";

/**
 * Server-side enforcement of the §4 permission table, exercised over HTTP.
 * Requires a running app with a local admin and worker:
 *   E2E_ADMIN_USER / E2E_ADMIN_PASS, E2E_WORKER_USER / E2E_WORKER_PASS
 */
const admin = { user: process.env.E2E_ADMIN_USER ?? "admin", pass: process.env.E2E_ADMIN_PASS ?? "local-admin-password-123" };
const worker = { user: process.env.E2E_WORKER_USER ?? "worker1", pass: process.env.E2E_WORKER_PASS ?? "local-worker-password-123" };

async function login(page: Page, who: { user: string; pass: string }) {
  await page.goto("/login");
  await page.getByLabel(/identifiant|login|المعرّف|اسم المستخدم/i).first().fill(who.user);
  await page.getByLabel(/mot de passe|password|كلمة المرور/i).first().fill(who.pass);
  await page.getByRole("button", { name: /se connecter|sign in|تسجيل الدخول/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test.describe("anonymous", () => {
  test("can read the menu and cannot open staff areas", async ({ page, request }) => {
    await expect((await request.get("/")).status()).toBe(200);
    await expect((await request.get("/api/menu")).status()).toBe(200);
    for (const url of ["/api/board/stream", "/api/board/orders", "/api/admin/orders/export"]) {
      const res = await request.get(url, { maxRedirects: 0 });
      expect([401, 307, 302], url).toContain(res.status());
    }
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("worker", () => {
  test("sees the board, is refused finance/admin resources with 403", async ({ page }) => {
    await login(page, worker);
    await expect(page).toHaveURL(/\/board/);
    const ctx = page.context();
    expect((await ctx.request.get("/api/board/orders")).status()).toBe(200);
    // Admin-only API: must be 403 (never a hidden button as the only protection)
    expect((await ctx.request.get("/api/admin/orders/export")).status()).toBe(403);
    // Admin pages redirect the worker to the board
    await page.goto("/admin/stats");
    await expect(page).toHaveURL(/\/board/);
    await page.goto("/admin/staff");
    await expect(page).toHaveURL(/\/board/);
  });
});

test.describe("admin", () => {
  test("opens admin and the board, export works", async ({ page }) => {
    await login(page, admin);
    await expect(page).toHaveURL(/\/admin/);
    const ctx = page.context();
    expect((await ctx.request.get("/api/board/orders")).status()).toBe(200);
    expect((await ctx.request.get("/api/admin/orders/export")).status()).toBe(200);
  });
});
