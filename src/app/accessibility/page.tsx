import { LegalDocument } from "@/components/public/LegalDocument";
import { loadPublicSiteConfig } from "@/lib/site/public-site";

export default function AccessibilityPage() {
  const config = loadPublicSiteConfig();

  return (
    <LegalDocument
      title="Accessibility statement"
      summary="The publication is designed to make research and legal information usable across devices and access needs."
      effectiveDate={config.policies.effectiveDate}
      reviewDate={config.policies.reviewDate}
    >
      <section>
        <h2>Our target</h2>
        <p>
          VettedSaaSBlueprint targets WCAG 2.2 Level AA. This statement describes an ongoing design and testing objective, not a certification or a promise that every page is free of barriers.
        </p>
      </section>
      <section>
        <h2>Interaction and presentation</h2>
        <ul>
          <li>Semantic landmarks, headings, and meaningful link text support navigation.</li>
          <li>Keyboard operation and visible focus styles are required for interactive controls.</li>
          <li>Text and controls are designed for readable contrast and responsive zoom.</li>
          <li>Motion respects reduced-motion preferences and does not block access to content.</li>
          <li>Important information is not communicated by colour alone.</li>
        </ul>
      </section>
      <section>
        <h2>Feedback</h2>
        <p>
          If you encounter a barrier, email <a href={`mailto:${config.operator.publicEmail}`}>{config.operator.publicEmail}</a>. Include the page address, the task you were trying to complete, your browser or assistive technology if comfortable sharing it, and a description of the problem. Accessibility reports are reviewed as editorial defects.
        </p>
      </section>
    </LegalDocument>
  );
}
