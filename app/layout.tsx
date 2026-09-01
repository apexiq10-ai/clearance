import type { Metadata } from "next";
import {
  Archivo,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Instrument_Serif,
} from "next/font/google";
import "./globals.css";

/** Headings and row names. */
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

/** Body prose and method text. The default. */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-sans",
  display: "swap",
});

/** All numerals, all citations, all rail findings, all chips. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

/** The thesis line and the two totals only. */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

/**
 * The mark as an inline data URI, so the favicon needs no asset pipeline and
 * no second source of truth. Literal hex rather than tokens, because a favicon
 * has no stylesheet to read them from.
 */
const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 15">' +
      '<defs><pattern id="h" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="4" height="4" fill="#F1ECFF"/><rect width="2" height="4" fill="#7C52FF" opacity="0.35"/>' +
      "</pattern></defs>" +
      '<rect width="18" height="6" fill="#7C52FF"/>' +
      '<rect y="9" width="28" height="6" fill="url(#h)"/>' +
      "</svg>"
  );

export const metadata: Metadata = {
  title: "Clearance",
  description:
    "Contact centre AI opportunity at a financial institution, split into value capturable under controls evidenced today and value held behind named control gates.",
  icons: { icon: [{ url: FAVICON, type: "image/svg+xml" }] },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable} ${instrumentSerif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
