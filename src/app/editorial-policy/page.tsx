import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/LegalDocument";
import { LegalSections, type LegalSection } from "@/components/public/LegalSections";
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
  const sections = [
    ["Evidence before conclusions", <p key="evidence">Reviews should connect material claims to current, resolvable evidence such as official product documentation, vendor terms, and verified offer details. Unsupported rankings, invented usage, fabricated urgency, and hidden qualification language are not acceptable.</p>],
    ["Decision fit and limitations", <p key="fit">Each review is written for a distinct buyer decision. It should explain who may benefit, who may not, the most relevant limitation, and which facts require direct confirmation with the vendor.</p>],
    ["AI boundaries", <p key="ai">Runtime AI may produce structured JSON drafts only. Approved application code renders the page. AI output cannot approve itself, change publication state, invent evidence, or silently alter affiliate destinations.</p>],
    ["Verified release", <p key="release">Drafts pass uniqueness, compliance, conversion, asset, link, preview, and production-readiness checks before a fingerprinted release receipt can make them public. A review is not public merely because a draft file exists.</p>],
    ["Affiliate independence", <p key="affiliate">VettedSaaSBlueprint may earn commissions, but compensation does not guarantee a positive review or excuse incomplete disclosure. The original approved destination and tracking parameters are preserved, and disclosure stays near the first affiliate call to action.</p>],
    ["Corrections", <p key="corrections">Send a correction request to <a href={`mailto:${config.operator.publicEmail}`}>{config.operator.publicEmail}</a> with the page, disputed statement, and supporting source. Material changes are reviewed and approved before republication.</p>],
  ] satisfies LegalSection[];

  return (
    <LegalDocument
      title="Editorial policy"
      summary="How evidence, limitations, affiliate relationships, and verified release gates shape every published review."
      effectiveDate={config.policies.effectiveDate}
      reviewDate={config.policies.reviewDate}
    >
      <LegalSections sections={sections} />
    </LegalDocument>
  );
}
