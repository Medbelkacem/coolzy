import type { Metadata, Viewport } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { dirOf, type AppLocale } from "@/i18n/config";
import { fontClassNames } from "./fonts";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: { default: t("appName"), template: `%s — ${t("appName")}` },
    description: `${t("tagline")} — ${t("subline")}`,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: t("appName"), statusBarStyle: "black-translucent" },
    icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0E0C0B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("common");
  return (
    <html lang={locale} dir={dirOf(locale)} className={fontClassNames} suppressHydrationWarning>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 btn btn-primary">
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
