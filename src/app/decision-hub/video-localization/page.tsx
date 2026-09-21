import type { Metadata } from "next";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { LocalizationJourney } from "@/components/public/LocalizationJourney";
import { localizationPages } from "@/lib/decision-journey/video-localization";

const page = localizationPages[0];
export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: page.path }, openGraph: { title: page.title, description: page.description, url: page.path, type: "article" } };
export default function Page() { return <PublicPageShell><LocalizationJourney page={page} /></PublicPageShell>; }
