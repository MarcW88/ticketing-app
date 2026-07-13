import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codex des Mondes Parallèles",
  description: "Quest Log — RPG task manager across parallel universes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="noctua-bg">{children}</body>
    </html>
  );
}
