import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controlled Affiliate Intelligence Loop",
  description: "Compliance-first affiliate research, evidence, publishing, and optimization engine.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
