import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionJourneyPage } from "@/components/public/DecisionJourneyPage";
import { getDecisionSetPage, listDecisionSets } from "@/lib/decision-journey/sets";

type Props = { params: Promise<{ setSlug: string }> };
export function generateStaticParams() { return listDecisionSets().map(({ slug }) => ({ setSlug: slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { setSlug } = await params; const page = getDecisionSetPage(setSlug, "solution-hub"); return page ? { title: page.headline, alternates: { canonical: page.canonicalPath } } : {}; }
export default async function Page({ params }: Props) { const { setSlug } = await params; const record = getDecisionSetPage(setSlug, "solution-hub"); if (!record) notFound(); return <DecisionJourneyPage record={record} />; }
