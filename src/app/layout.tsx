import type { Metadata } from "next";
import { loadPublicSiteConfig, publicSiteMetadata } from "@/lib/site/public-site";
import "./globals.css";

export const metadata: Metadata = publicSiteMetadata(loadPublicSiteConfig());

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
