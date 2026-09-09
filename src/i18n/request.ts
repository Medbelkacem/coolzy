import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? raw : defaultLocale;
  return {
    locale,
    timeZone: "Africa/Algiers",
    messages: (await import(`../generated/messages/${locale}.json`)).default,
    onError(error) {
      // A missing key is a bug. Never silently render a key path.
      if (process.env.NODE_ENV !== "production") throw error;
      console.error(error);
    },
    getMessageFallback({ key, namespace }) {
      return `⚠ ${namespace ? namespace + "." : ""}${key}`;
    },
  };
});
