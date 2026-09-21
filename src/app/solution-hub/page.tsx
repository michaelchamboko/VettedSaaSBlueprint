import type { Metadata } from "next";

import { DecisionJourneyPage } from "@/components/public/DecisionJourneyPage";
import { decisionJourneyCatalog } from "@/lib/decision-journey/catalogue";

const record = decisionJourneyCatalog["/solution-hub"];

export const metadata: Metadata = {
  title: record.headline,
  description: record.decisionContext,
  alternates: { canonical: record.canonicalPath },
  openGraph: { title: record.headline, description: record.decisionContext, url: record.canonicalPath },
};

export default function SolutionHubPage() { return <DecisionJourneyPage record={record} />; }
