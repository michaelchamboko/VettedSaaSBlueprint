import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionJourneyPage } from "@/components/public/DecisionJourneyPage";
import { getDecisionSet, getDecisionSetPage, listDecisionSets } from "@/lib/decision-journey/sets";
import { loadArticleHero } from "@/lib/article-heroes";
import { fingerprintEditorialArtifact } from "@/lib/editorial/refinement";

type Props = { params: Promise<{ setSlug: string }> };
export function generateStaticParams() { return listDecisionSets().map(({ slug }) => ({ setSlug: slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { setSlug } = await params; const page = getDecisionSetPage(setSlug, "solution-hub"); return page ? { title: page.headline, alternates: { canonical: page.canonicalPath } } : {}; }
export default async function Page({ params }: Props) { const { setSlug } = await params; const set = getDecisionSet(setSlug); if (!set) notFound(); const reviewedHero = loadArticleHero("decision-set", set.slug, fingerprintEditorialArtifact(set))?.asset; return <DecisionJourneyPage record={set.pages.solutionHub} reviewedHero={reviewedHero} />; }
