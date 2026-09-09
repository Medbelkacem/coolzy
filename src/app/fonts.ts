import { Fraunces, Instrument_Sans, IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
  variable: "--font-fraunces",
  display: "swap",
});

export const instrument = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-instrument",
  display: "swap",
});

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-ar",
  display: "swap",
});

export const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-naskh",
  display: "swap",
});

export const fontClassNames = [fraunces.variable, instrument.variable, plexArabic.variable, naskh.variable].join(" ");
