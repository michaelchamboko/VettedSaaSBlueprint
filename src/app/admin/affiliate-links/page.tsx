export default function AffiliateLinksPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold">Affiliate Link Vault</h1>
        <p className="mt-3 text-sm text-slate-300">
          Store the original PartnerStack referral URL separately from the destination URL and preserve the link provenance.
        </p>
      </header>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6" method="post" action="/api/admin/affiliate-links">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Product ID</span>
              <input name="product_id" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Link type</span>
              <input name="link_type" type="text" placeholder="primary_cta" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Original PartnerStack URL</span>
              <input name="partnerstack_url" type="url" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Destination URL</span>
              <input name="destination_url" type="url" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Geo target</span>
              <input name="geo_target" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Page angle</span>
              <input name="page_angle" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">UTM source</span>
              <input name="utm_source" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">UTM medium</span>
              <input name="utm_medium" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
          </div>
          <button className="rounded bg-white px-4 py-2 text-sm font-medium text-slate-950" type="submit">
            Create affiliate link
          </button>
        </form>

        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-300">
          <h2 className="text-lg font-medium text-white">Vault rules</h2>
          <p>Only original PartnerStack referral URLs are accepted by validation.</p>
          <p>Destination URLs stay separate so the source referral remains auditable.</p>
          <p>Changes should create review or audit records for traceability.</p>
        </aside>
      </section>
    </main>
  );
}
