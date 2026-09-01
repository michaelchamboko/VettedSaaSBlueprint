import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DeploymentEnvironment = {
  readonly VERCEL_ENV?: string;
  readonly VERCEL_GIT_COMMIT_SHA?: string;
};

export function deploymentMetadata(environment?: DeploymentEnvironment) {
  const source = environment ?? process.env;
  return {
    commitSha: source.VERCEL_GIT_COMMIT_SHA?.trim() || null,
    environment: source.VERCEL_ENV?.trim() || "local",
  };
}

export function GET() {
  return NextResponse.json(
    deploymentMetadata(),
    { headers: { "Cache-Control": "no-store" } },
  );
}
