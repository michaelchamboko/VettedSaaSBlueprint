import { z } from "zod";

export const landingWorkflowStatusSchema = z.enum([
  "PASS",
  "FAIL",
  "BLOCKED",
  "NOT_RUN",
  "NOT_APPLICABLE",
]);

export type LandingWorkflowStatus = z.infer<typeof landingWorkflowStatusSchema>;

export const landingWorkflowResultSchema = z.object({
  contract_version: z.literal("landing_workflow_v4"),
  batch_id: z.string().uuid().nullable(),
  status: landingWorkflowStatusSchema,
  stage: z.string().min(1),
  reason_codes: z.array(z.string().min(1)),
  artifacts: z.array(z.string().min(1)),
});

export type LandingWorkflowResult = z.infer<typeof landingWorkflowResultSchema>;
