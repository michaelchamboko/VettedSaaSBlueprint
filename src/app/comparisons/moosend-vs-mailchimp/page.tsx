import { metadataForPublishedVisibilityPage, renderPublishedVisibilityPage } from "@/lib/visibility-pages/route";
export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/comparisons/moosend-vs-mailchimp" as const;
export const generateMetadata = () => metadataForPublishedVisibilityPage(path);
export default function Page() { return renderPublishedVisibilityPage(path); }
