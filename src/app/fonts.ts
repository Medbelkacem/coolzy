import { Fraunces, Instrument_Sans, IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic } from "next/font/google";

/**
 * Latin faces are preloaded; Arabic faces are declared but only fetched when
 * the html[lang="ar"] rules use them, so a French visitor on 3G never pays
 * for them. Google's "latin" subset already covers œ/Œ and the French accents.
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  variable: "--font-fraunces",
  display: "swap",
});

export const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-ar",
  display: "swap",
  preload: false,
});

export const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-naskh",
  display: "swap",
  preload: false,
});

export const fontClassNames = [fraunces.variable, instrument.variable, plexArabic.variable, naskh.variable].join(" ");
