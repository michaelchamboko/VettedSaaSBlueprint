import {
  deploymentReceiptSchema,
  editorialBriefSchema,
  evidenceUpdateSchema,
  pageSetChangeSchema,
  watchdogReceiptSchema,
  type AutomationJobType,
} from "@/lib/automation/contracts";
import { readLocalAutomationReceipt, type LocalAutomationStore } from "@/lib/automation/local-store";

export function parseWorkflowResult(type: AutomationJobType, value: unknown): unknown {
  switch (type) {
    case "research": return evidenceUpdateSchema.parse(value);
    case "editorial_brief": return editorialBriefSchema.parse(value);
    case "optimise": return pageSetChangeSchema.parse(value);
    case "watchdog": return watchdogReceiptSchema.parse(value);
    case "release": return deploymentReceiptSchema.parse(value);
  }
}

export async function assertWorkflowPrerequisites(input: {
  store: LocalAutomationStore;
  type: AutomationJobType;
  scheduledWindow: string;
  result: unknown;
}) {
  if (input.type === "editorial_brief") {
    const research = await readLocalAutomationReceipt(input.store, input.scheduledWindow, "research");
    if (!research) throw new Error("Editorial brief requires a research receipt for the same scheduled window.");
    const result = (research as { result?: unknown }).result;
    const evidence = evidenceUpdateSchema.parse(result);
    if ((input.result as { version?: unknown }).version === 2 && evidence.version !== 2) {
      throw new Error("A version 2 editorial brief requires a version 2 research evidence packet for the same scheduled window.");
    }
  }
  if (input.type === "optimise") {
    const editorial = await readLocalAutomationReceipt(input.store, input.scheduledWindow, "editorial_brief");
    if (!editorial) throw new Error("Optimisation requires an editorial brief receipt for the same scheduled window.");
  }
  if (input.type === "release") {
    const change = await readLocalAutomationReceipt(input.store, input.scheduledWindow, "optimise");
    if (!change) throw new Error("Release requires an optimisation receipt for the same scheduled window.");
  }
}
