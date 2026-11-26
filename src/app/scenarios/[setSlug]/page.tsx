import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionJourneyPage } from "@/components/public/DecisionJourneyPage";
import { DecisionReport } from "@/components/public/DecisionReport";
import { getDecisionSet, listDecisionSets } from "@/lib/decision-journey/sets";
import { loadArticleHero } from "@/lib/article-heroes";
import { fingerprintEditorialArtifact } from "@/lib/editorial/refinement";

type Props = { params: Promise<{ setSlug: string }> };
export function generateStaticParams() { return listDecisionSets().map(({ slug }) => ({ setSlug: slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { setSlug } = await params; const set = getDecisionSet(setSlug); return set ? { title: set.pages.scenario.headline, alternates: { canonical: set.pages.scenario.canonicalPath } } : {}; }
export default async function Page({ params }: Props) { const { setSlug } = await params; const set = getDecisionSet(setSlug); if (!set) notFound(); const reviewedHero = loadArticleHero("decision-set", set.slug, fingerprintEditorialArtifact(set))?.asset; return <DecisionJourneyPage record={set.pages.scenario} reviewedHero={reviewedHero} afterContent={<DecisionReport report={set.report} />} />; }
