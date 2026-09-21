import { NextResponse } from "next/server";
import { deploymentMetadata } from "@/lib/site/deployment-metadata";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    deploymentMetadata(),
    { headers: { "Cache-Control": "no-store" } },
  );
}
