import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veritas",
  description: "Trustless AI verdict primitive for the Somnia Agentic L1",
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
