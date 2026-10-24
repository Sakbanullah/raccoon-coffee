import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Signature script for the hero wordmark only; self-hosted, single weight.
// Local file (not next/font/google) so a Google Fonts fetch failure can never
// silently swap the wordmark to the cursive/Arial fallback.
const allura = localFont({
  src: "./fonts/allura-latin-400.woff2",
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Raccoon Coffee Baturaja — Coffee and Chill",
  description: "Raccoon Coffee Baturaja. Coffee and Chill. Bakung, Baturaja. Selasa–Minggu, 13.00–23.00.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={allura.variable}>
      <body className="bg-cream text-navy font-body antialiased">{children}</body>
    </html>
  );
}
