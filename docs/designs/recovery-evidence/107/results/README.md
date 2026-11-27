# Frozen reviewer results

Write one JSON file per case only after the reviewer has returned a final response. Preserve the response verbatim in `rawResponse` and record the exact commit under `reviewedRevision`.

Required fields: `caseId`, `reviewerId`, `reviewedRevision`, `observedEvidence`, `verdict`, `explanation`, and `rawResponse`. `verdict` is `meets` or `does_not_meet`.

Do not compare a result with the answer key until all six files exist.
