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

export const metadata: Metadata = {
  title: "The Permission Ledger",
  description:
    "Contact centre AI opportunity at a financial institution, split into value capturable under controls evidenced today and value held behind named control gates.",
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
