import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Text RPG MVP",
  description: "テキストベースのオンラインRPG MVP",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <div className="max-w-5xl mx-auto p-3 sm:p-4">{children}</div>
      </body>
    </html>
  );
}
