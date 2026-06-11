import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { pageBlueprintSchema } from "@/lib/schemas/contracts";
import { DirectReviewPage } from "@/components/landing/DirectReviewPage";

export const revalidate = 10800;

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { rows } = await sql`select pb.structural_json from dynamic_pages dp join page_blueprints pb on pb.id = dp.blueprint_id where dp.path = ${`/landing-page-builders/${slug}`} and dp.status = 'published' limit 1`;
  if (!rows[0]) notFound();
  const blueprint = pageBlueprintSchema.parse(rows[0].structural_json);
  return <DirectReviewPage blueprint={blueprint} />;
}
