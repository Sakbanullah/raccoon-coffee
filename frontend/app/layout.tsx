import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raccoon Coffee Baturaja — Coffee and Chill",
  description: "Raccoon Coffee Baturaja. Coffee and Chill. Bakung, Baturaja. Selasa–Minggu, 13.00–23.00.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-cream text-navy font-body antialiased">{children}</body>
    </html>
  );
}
