"use client";

import Link from "next/link";
import type { DecisionSetV2 } from "@/lib/decision-journey/sets";

export function DecisionReport({ report }: { report: DecisionSetV2["report"] }) {
  return (
    <aside className="decision-report" aria-labelledby="decision-report-title">
      <p className="public-eyebrow">Printable decision report · evidence {report.evidenceState}</p>
      <h2 id="decision-report-title">A portable record of the decision boundary</h2>
      <p>{report.context}</p>
      <div><section><h3>Proceed only when</h3><ul>{report.conditions.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Known limitations</h3><ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section></div>
      <p><Link href={report.fullReasoningPath}>Read the full reasoning path</Link></p>
      <button type="button" onClick={() => window.print()}>Print this report</button>
    </aside>
  );
}
