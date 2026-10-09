# Decision Guide Card Fix — Vercel Release Plan

Status: corrected implementation verified locally; commit, push, staged production deployment, promotion, and live verification pending
Branch: `codex/decision-card-accordion`
Current branch commit: `18ba821cf1fa565a359ff7db99f1bd9501ebe8ac`
Vercel project: `vetted-saa-s-blueprint` (`prj_6ymKeAz0lqMs8LYvplkn4AKMya7J`)
Vercel team: `team_0Vjm5yuoHjiIcGq0hoJMm5vC`
Production domain: `https://vettedsaasblueprint.online`
Rollback deployment: `dpl_3JiCFmSej76oS8oRepiUcbCsrit8`

## 1. Objective

Release the owner-approved cascading decision-guide card fix to Vercel without rebuilding unrelated surfaces. The release must promote the same production artifact that passes staged verification, preserve all existing routes and copy, and leave a recoverable rollback to the currently live deployment.

## 2. Release scope

Expected application changes:

- `src/components/public/DecisionGuideAccordion.tsx`
- scoped decision-guide rules in `src/app/globals.css`
- `tests/decision-guide-accordion.test.ts`
- the narrowed vertical-text assertion in `tests/reference-composed-renderer.test.ts`
- `public/images/decision-guides/decision.png`
- `public/images/decision-guides/solution.png`
- `public/images/decision-guides/scenario.png`

Expected review evidence:

- `.impeccable/review/desktop.png`
- `.impeccable/review/mobile.png`
- `.impeccable/review/direction.md`

No database migration, environment-variable change, route change, dependency addition, DNS change, Vercel configuration change, or automation change is required.

## 3. Pre-commit gate

1. Inspect the managed worktree and enumerate every modified or untracked file.
2. Reject unrelated files; the commit must contain only the release scope above and any required receipt update created after deployment.
3. Confirm the generated images contain no text, logo, or claim and are referenced through local `/images/decision-guides/*` paths.
4. Run the release gates from the linked project root:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
   - `npm run validate:public-site`
5. Require these results before committing:
   - lint: 0 errors;
   - typecheck: exit 0;
   - tests: 277 passed, 0 failed, with only the three recorded Windows symlink skips;
   - production build: exit 0 and 129 static pages;
   - public-site validation: exit 0;
   - Impeccable detector: 0 findings;
   - finish review: `ship` for all six reviewed fixes.

## 4. Commit and push

1. Create one focused commit on `codex/decision-card-accordion`, for example: `fix: match approved decision guide card deck`.
2. Confirm the committed diff still matches the release scope and contains no credentials, `.env` files, browser state, or Vercel authentication data.
3. Push the branch to `origin/codex/decision-card-accordion`.
4. Record the resulting commit SHA. That SHA becomes the release identity used by the deployment receipt and verification evidence.

## 5. Stage the production artifact

Use the repository's existing Vercel link in `.vercel/project.json`; do not relink or change project/team settings.

1. Confirm the CLI target before release:
   - team: `team_0Vjm5yuoHjiIcGq0hoJMm5vC`;
   - project: `prj_6ymKeAz0lqMs8LYvplkn4AKMya7J`;
   - environment: production;
   - commit: the SHA created in section 4.
2. Stage a production deployment without assigning the production domain:
   - `vercel deploy --prod --skip-domain`
3. Capture the returned deployment ID and `vercel.app` URL.
4. Run `vercel inspect <staged-url>` and require `READY` before browser verification.

This follows the prior successful release path and avoids testing one artifact before rebuilding a different artifact for production.

## 6. Verify the staged deployment

Verify the staged production URL, not localhost and not the existing custom domain.

Automated checks:

- homepage returns 200;
- `/decision-hub`, `/solution-hub`, and `/scenarios` return 200;
- homepage contains three named native disclosures per guide group;
- one disclosure starts open and state transfers when another summary is activated;
- all existing guide hrefs are unchanged;
- no horizontal overflow at 390px and 320px;
- reduced-motion mode removes authored card motion;
- browser console reports zero errors.

Visual checks:

- at 1440px the introduction is left and the cascading deck is right;
- the active card contains grouped copy, clay action, and inset image;
- closed tabs overlap the active card, with dark `02` and paper `03` states;
- opening `02` transfers the active-card presentation and returns it to paper;
- mobile shows the active card followed by two full-width horizontal disclosures;
- keyboard focus remains visible on summaries and the guide link.

Do not promote if the staged render differs materially from `.impeccable/review/desktop.png` or `.impeccable/review/mobile.png`.

## 7. Promote and verify production

1. Promote the verified staged artifact without rebuilding it:
   - `vercel promote <staged-url-or-deployment-id>`
2. Confirm `https://vettedsaasblueprint.online` resolves to the promoted deployment.
3. Repeat the route, interaction, responsive, focus, console, and visual smoke checks against the custom domain.
4. Inspect recent production errors:
   - `vercel logs <production-url> --level error --since 1h`
5. Require zero card-related runtime or asset errors before closing the release.

## 8. Receipt and evidence

Update `build-pack/evidence/DECISION-CARD-ACCORDION/deploy-receipt.json` only after production verification. Record:

- authorization source and timestamp;
- deployed commit SHA and branch;
- deployment ID, staged URL, custom domain, target, state, project, and release method;
- each pre-deploy gate result;
- staged and production route/interaction/viewport results;
- browser console result and Vercel error-log scan;
- known non-blocking platform warnings, kept separate from failures.

Commit and push the receipt as a documentation-only follow-up commit. The receipt commit is not the deployed application commit and must name the deployed SHA explicitly.

## 9. Rollback

Rollback trigger: any broken public route, missing card asset, unusable disclosure state, mobile overflow, inaccessible control, browser runtime error, or material mismatch with the approved captures.

Rollback procedure:

1. Promote the last verified production deployment `dpl_3JiCFmSej76oS8oRepiUcbCsrit8`.
2. Verify the custom domain and core public routes return 200.
3. Record the rollback deployment, reason, time, and verification results in the deployment receipt/evidence directory.
4. Do not patch production in place. Correct the branch, repeat all gates, create a new staged production artifact, and promote only after verification.

## 10. Completion criteria

The release is complete only when:

- the scoped fix is committed and pushed;
- the exact staged production artifact passes automated and visual verification;
- that artifact is promoted to the custom domain;
- live routes, interactions, responsive layouts, console, and Vercel error logs pass;
- the deployment receipt records the deployed application commit and production deployment ID;
- rollback remains available and documented.
