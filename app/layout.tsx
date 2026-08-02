import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DFV Sensei",
  description: "Turn business ideas into evidence-based commercialisation decisions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
