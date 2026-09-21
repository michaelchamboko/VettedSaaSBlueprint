import type { DecisionJourneyRecordV1 } from "./catalogue";
import type { DecisionJourneyRecordV2 } from "./sets";

type JourneyPresentation = {
  label: string;
  premise: string;
  catalogueReferences: readonly string[];
  compositionFamily: string;
  motionPurpose: string;
};

// Approved local visual-reference headings. These are compositional references,
// not imported third-party components or public endorsements.
export const journeyPresentations: Record<DecisionJourneyRecordV1["pageType"], JourneyPresentation> = {
  "decision-hub": {
    label: "Diagnostic brief",
    premise: "Make the situation legible before comparing approaches.",
    compositionFamily: "diagnostic-split",
    catalogueReferences: ["Tailblocks Classic Light Split Hero", "UI Layouts Condition Grid"],
    motionPurpose: "Carry the reader from the problem frame into the evidence criteria.",
  },
  "solution-hub": {
    label: "Fit map",
    premise: "Move through the seven decisions that make an approach fit or fail.",
    compositionFamily: "fit-map",
    catalogueReferences: ["Preline Hero with Client Logo Row", "UI Layouts Condition Grid"],
    motionPurpose: "Keep the active step and its supporting evidence in context.",
  },
  scenario: {
    label: "Constraint test",
    premise: "Turn one concrete operating situation into a conditional next action.",
    compositionFamily: "constraint-bento",
    catalogueReferences: ["daisyUI Hero with Figure", "UI Layouts Stats Bento"],
    motionPurpose: "Progress from constraints through trade-offs to a conditional verdict.",
  },
};

export function getJourneyPresentation(record: DecisionJourneyRecordV1 | DecisionJourneyRecordV2): JourneyPresentation {
  const defaultPresentation = journeyPresentations[record.pageType];
  if (!record.presentation) return defaultPresentation;
  return {
    ...defaultPresentation,
    compositionFamily: record.presentation.compositionFamily,
    catalogueReferences: record.presentation.catalogueReferences,
  };
}
