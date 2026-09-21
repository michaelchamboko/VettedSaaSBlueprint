import type { Metadata } from "next";

import { DecisionJourneyPage } from "@/components/public/DecisionJourneyPage";
import { decisionJourneyCatalog } from "@/lib/decision-journey/catalogue";

const record = decisionJourneyCatalog["/decision-hub"];

export const metadata: Metadata = {
  title: record.headline,
  description: record.decisionContext,
  alternates: { canonical: record.canonicalPath },
  openGraph: { title: record.headline, description: record.decisionContext, url: record.canonicalPath },
};

export default function DecisionHubPage() { return <DecisionJourneyPage record={record} />; }
