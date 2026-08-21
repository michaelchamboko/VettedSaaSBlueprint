import type { Metadata } from "next";
import "@fontsource/archivo-black/latin-400.css";
import "@fontsource/dm-serif-display/latin-400.css";
import "@fontsource-variable/dm-sans/wght.css";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource-variable/manrope/wght.css";
import "@fontsource-variable/source-sans-3/wght.css";
import "@fontsource-variable/space-grotesk/wght.css";
import { loadPublicSiteConfig, publicSiteMetadata } from "@/lib/site/public-site";
import "./globals.css";

export const metadata: Metadata = publicSiteMetadata(loadPublicSiteConfig());

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="p:domain_verify" content="cb2864e228f624d0192e54e0c6d3f9dc" />
      </head>
      <body>{children}</body>
    </html>
  );
}
