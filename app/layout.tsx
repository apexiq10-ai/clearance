import type { Metadata } from "next";
import {
  DM_Sans,
  IBM_Plex_Mono,
  Instrument_Serif,
  Outfit,
} from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
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
      className={`${instrumentSerif.variable} ${outfit.variable} ${plexMono.variable} ${dmSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
