import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Divvy — Shared expense management",
  description: "Automated roommate expense and cost management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
