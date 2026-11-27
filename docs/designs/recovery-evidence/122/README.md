# Reviewer recheck for issue 122

This bundle rechecks the unchanged six synthetic cases from issue 107 against the reviewer configuration used for the article-recovery integration revision. It does not run an article, mutate import state, call a paid service, or make a release.

## Frozen inputs

- Examined integration revision: `cf0012f0b8d0795e9717ca427bc8bad4ce41ed2e`.
- Original case evidence revision: `bebb4fe644b3d97e9a21f46a6e06938ed35684cb`.
- Reviewer route: one fresh native Codex context per case through the existing local entitlement, with no paid external reviewer.
- Assignment: give a reviewer only its packet and the evidence paths named in that packet. Withhold sibling packets, the answer key, expected outcomes, pair labels, and previous results.

Each reviewer must return observed evidence, one `meets` or `does_not_meet` verdict, and an explanation. Results stay separate until all six responses are frozen. The evaluation then records verdict accuracy and checks every explanation against the case evidence before counting it as accurate.

## Verification

Run `node --test docs/designs/recovery-evidence/122/verify.test.mjs`.

The verifier checks neutral packet construction, revision and configuration binding, immutable historical evidence objects, six distinct retained reviewer results, miss and false-alarm accounting, and sensitivity to a changed verdict. It does not claim to score explanation meaning mechanically. The retained comparison records that independent case-by-case assessment.
