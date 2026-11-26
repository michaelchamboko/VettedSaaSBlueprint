# RELEASING-THREE-1126 verification

## Scope

User directive. This packet changes the existing supervised article-release handoff and synthetic tests only. Verification cannot run, merge, deploy or publish a real article, and it cannot change an article lifecycle state. The code change still follows the repository's required PR, review, merge and deployment workflow.

## Before

- `--describe-workflow` exposed RELEASING as one prose instruction with no machine-readable actions.
- Supervised RELEASING packets did not name the operator's three release actions.
- When a direct review's approved artifact path already was its public projection path, candidate assessment loaded and compared the same JSON twice.

## After

- `releaseSteps` defines exactly three actions: validate the candidate, review and deploy, and verify production.
- `--describe-workflow` and the supervised RELEASING packet expose the same structured steps. The tracked skill uses the same order.
- Candidate checks still run again after intervening commands. The merged checkout still gets independent validation, authority binding, artifact fingerprint, workflow-evidence and presentation-binding checks before deployment.
- Direct reviews skip the second candidate artifact load only when the normalized approved source path equals the public projection path. A distinct draft path still requires the draft-to-public comparison.
- The merged publication path is computed once within the same merged checkout. No evidence result is cached across candidate, review, merge, deployment, or changed input.

## Verification

Node 24.22.3 ran the three release-specific cases in 19 seconds. All three passed.

- The CLI workflow description lists exactly three release actions.
- The supervised executor writes the same three actions in the release packet before waiting for its result.
- The projection check skips the identical path and rejects changed content at a distinct path.

Reproduce with:

~~~powershell
node --import tsx --test --test-name-pattern="three actionable|direct-review projection binding" tests/article-import-release.test.ts tests/article-import-supervised.test.ts
~~~

The agent workflow contract, lint and typecheck passed. Lint reported 16 warnings and zero errors. The tests used synthetic inputs.
