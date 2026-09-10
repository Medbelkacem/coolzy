import { Fraunces, Instrument_Sans, IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic } from "next/font/google";

/**
 * The two Latin faces that carry first paint are preloaded; the italic and the
 * Arabic faces are declared but fetched only where they are used, so a French
 * visitor on 3G never pays for them. Google's "latin" subset already covers
 * œ/Œ and the French accents.
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal"],
  weight: "400",
  variable: "--font-fraunces",
  display: "swap",
});

/** The italic is a second face so it is not preloaded ahead of the hero photo. */
export const frauncesItalic = Fraunces({
  subsets: ["latin"],
  style: ["italic"],
  weight: "400",
  variable: "--font-fraunces-italic",
  display: "swap",
  preload: false,
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

export const fontClassNames = [fraunces.variable, frauncesItalic.variable, instrument.variable, plexArabic.variable, naskh.variable].join(" ");
