import type fr from "../generated/messages/fr.json";
import type { AppLocale } from "./config";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof fr;
    Locale: AppLocale;
  }
}
