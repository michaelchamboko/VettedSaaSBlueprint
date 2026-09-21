import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/LegalDocument";
import { loadPublicSiteConfig } from "@/lib/site/public-site";

export const metadata: Metadata = {
  title: "Editorial policy",
  description: "How VettedSaaSBlueprint evaluates evidence, limitations, affiliate relationships, corrections, and release quality.",
  alternates: { canonical: "/editorial-policy" },
  openGraph: { title: "Editorial policy", description: "How VettedSaaSBlueprint evaluates evidence, limitations, affiliate relationships, corrections, and release quality.", url: "/editorial-policy" },
  robots: { index: true, follow: true },
};

export default function EditorialPolicyPage() {
  const config = loadPublicSiteConfig();

  return (
    <LegalDocument
      title="Editorial policy"
      summary="How evidence, limitations, affiliate relationships, and verified release gates shape every published review."
      effectiveDate={config.policies.effectiveDate}
      reviewDate={config.policies.reviewDate}
    >
      <section>
        <h2>Evidence before conclusions</h2>
        <p>
          Reviews should connect material claims to current, resolvable evidence such as official product documentation, vendor terms, and verified offer details. Unsupported rankings, invented usage, fabricated urgency, and hidden qualification language are not acceptable.
        </p>
      </section>
      <section>
        <h2>Decision fit and limitations</h2>
        <p>
          Each review is written for a distinct buyer decision. It should explain who may benefit, who may not, the most relevant limitation, and which facts require direct confirmation with the vendor.
        </p>
      </section>
      <section>
        <h2>AI boundaries</h2>
        <p>
          Runtime AI may produce structured JSON drafts only. Approved application code renders the page. AI output cannot approve itself, change publication state, invent evidence, or silently alter affiliate destinations.
        </p>
      </section>
      <section>
        <h2>Verified release</h2>
        <p>
          Drafts pass uniqueness, compliance, conversion, asset, link, preview, and production-readiness checks before a fingerprinted release receipt can make them public. A review is not public merely because a draft file exists.
        </p>
      </section>
      <section>
        <h2>Affiliate independence</h2>
        <p>
          VettedSaaSBlueprint may earn commissions, but compensation does not guarantee a positive review or excuse incomplete disclosure. The original approved destination and tracking parameters are preserved, and disclosure stays near the first affiliate call to action.
        </p>
      </section>
      <section>
        <h2>Corrections</h2>
        <p>
          Send a correction request to <a href={`mailto:${config.operator.publicEmail}`}>{config.operator.publicEmail}</a> with the page, disputed statement, and supporting source. Material changes are reviewed and approved before republication.
        </p>
      </section>
    </LegalDocument>
  );
}
