import type { ReactNode } from "react";

export type LegalSection = readonly [title: string, body: ReactNode];

export function LegalSections({ sections }: { sections: readonly LegalSection[] }) {
  return sections.map(([title, body]) => (
    <section key={title}>
      <h2>{title}</h2>
      {body}
    </section>
  ));
}
