import type { PageBlueprint } from "@/lib/schemas/contracts";

export function AffiliateDisclosure({ blueprint }: { blueprint: PageBlueprint }) {
  return (
    <aside className="rounded-2xl border border-white/15 bg-white/8 p-4 text-sm text-slate-200">
      <strong className="text-white">Affiliate disclosure:</strong> {blueprint.affiliate_disclosure.short_disclosure}
    </aside>
  );
}
