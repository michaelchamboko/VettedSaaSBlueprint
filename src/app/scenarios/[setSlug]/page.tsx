import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionJourneyPage } from "@/components/public/DecisionJourneyPage";
import { DecisionReport } from "@/components/public/DecisionReport";
import { getDecisionSet, listDecisionSets } from "@/lib/decision-journey/sets";

type Props = { params: Promise<{ setSlug: string }> };
export function generateStaticParams() { return listDecisionSets().map(({ slug }) => ({ setSlug: slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { setSlug } = await params; const set = getDecisionSet(setSlug); return set ? { title: set.pages.scenario.headline, alternates: { canonical: set.pages.scenario.canonicalPath } } : {}; }
export default async function Page({ params }: Props) { const { setSlug } = await params; const set = getDecisionSet(setSlug); if (!set) notFound(); return <DecisionJourneyPage record={set.pages.scenario} afterContent={<DecisionReport report={set.report} />} />; }
