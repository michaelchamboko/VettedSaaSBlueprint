export default function PurchaseDestinationReviewsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold">Purchase Destination Review</h1>
        <p className="mt-3 text-sm text-slate-300">
          Review the clicked destination without replacing the original affiliate URL, then capture the continuity cues that will guide the landing page.
        </p>
      </header>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6" method="post" action="/api/admin/purchase-destination-reviews">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Offer folder ID</span>
              <input name="offer_folder_id" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Affiliate link ID</span>
              <input name="affiliate_link_id" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Affiliate URL checked</span>
              <input name="affiliate_url_checked" type="url" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Final visible destination URL</span>
              <input name="final_visible_destination_url" type="url" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Redirect chain, one per line</span>
              <textarea name="redirect_chain" rows={3} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Message match notes</span>
              <textarea name="message_match_notes" rows={3} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">CTA language</span>
              <input name="cta_language" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Offer promise</span>
              <input name="offer_promise" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Pricing, trial, guarantee claims</span>
              <textarea name="pricing_trial_guarantee_claims" rows={3} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Trust cues</span>
              <textarea name="trust_cues" rows={3} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Friction notes</span>
              <textarea name="friction_notes" rows={3} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Visual affinity profile</span>
              <textarea name="visual_affinity_profile" rows={3} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Compliance warnings</span>
              <textarea name="compliance_warnings" rows={3} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Continuity score</span>
              <input name="conversion_continuity_score" type="number" min={0} max={100} defaultValue={0} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Owner reviewed</span>
              <input name="reviewed_by_owner" type="checkbox" className="mt-3 h-4 w-4" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Owner override</span>
              <input name="owner_override" type="checkbox" className="mt-3 h-4 w-4" />
            </label>
          </div>
          <button className="rounded bg-white px-4 py-2 text-sm font-medium text-slate-950" type="submit">
            Save destination review
          </button>
        </form>

        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-300">
          <h2 className="text-lg font-medium text-white">Review rules</h2>
          <p>The original affiliate URL remains the outbound URL and is never replaced by the final redirect target.</p>
          <p>A current destination review or explicit owner override is required before first publication.</p>
          <p>Review data should guide landing-page continuity, CTA wording, and motion/profile choices.</p>
        </aside>
      </section>
    </main>
  );
}
