import { metadataForPublishedVisibilityPage, renderPublishedVisibilityPage } from "@/lib/visibility-pages/route";
export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/guides/ai-voice-generators-for-youtube" as const;
export const generateMetadata = () => metadataForPublishedVisibilityPage(path);
export default function Page() { return renderPublishedVisibilityPage(path); }
