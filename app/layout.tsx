import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/** The fallback where SF Pro is not installed. Apple devices use the system face. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** The mark: a short solid capsule over a full, lighter one. Cleared over waiting. */
const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<rect width="32" height="32" rx="8" fill="#5b4cf0"/>' +
      '<rect x="7" y="10" width="12" height="5" rx="2.5" fill="#fff"/>' +
      '<rect x="7" y="17.5" width="18" height="5" rx="2.5" fill="#fff" fill-opacity="0.45"/>' +
      "</svg>"
  );

export const metadata: Metadata = {
  title: "Clearance: Contact center AI, sized to what's approved",
  description:
    "Size the contact center AI opportunity at a bank, credit union, lender or insurer. See what controls allow today, and the approvals that unlock the rest.",
  icons: { icon: [{ url: FAVICON, type: "image/svg+xml" }] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
