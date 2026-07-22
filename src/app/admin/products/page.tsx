const fields = [
  { name: "name", label: "Product name", type: "text" },
  { name: "slug", label: "Slug", type: "text" },
  { name: "website_url", label: "Website URL", type: "url" },
  { name: "partnerstack_id", label: "PartnerStack ID", type: "text" },
  { name: "primary_audience", label: "Primary audience", type: "text" },
  { name: "pricing_summary", label: "Pricing summary", type: "text" },
  { name: "commission_summary", label: "Commission summary", type: "text" },
];

export default function ProductsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold">Product Vault</h1>
        <p className="mt-3 text-sm text-slate-300">
          Capture the product record, audience, pricing, affiliate references, and review posture before anything reaches publishing.
        </p>
      </header>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6" method="post" action="/api/admin/products">
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field.name} className="space-y-2 text-sm">
                <span className="block text-slate-200">{field.label}</span>
                <input name={field.name} type={field.type} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
              </label>
            ))}
          </div>
          <label className="space-y-2 text-sm block">
            <span className="block text-slate-200">Description</span>
            <textarea name="description" rows={4} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Target countries</span>
              <input name="target_countries" placeholder="US,ZA,GB" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Competitors</span>
              <input name="competitor_products" placeholder="Airtable,Notion" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Seed keywords</span>
              <input name="seed_keywords" placeholder="project management,crm" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Status</span>
              <select name="status" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white">
                <option value="draft">Draft</option>
                <option value="researching">Researching</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Research priority</span>
              <input name="research_priority" type="number" min={0} max={100} defaultValue={50} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Auto low-risk updates</span>
              <input name="auto_low_risk_updates_enabled" type="checkbox" className="mt-3 h-4 w-4" />
            </label>
          </div>
          <button className="rounded bg-white px-4 py-2 text-sm font-medium text-slate-950" type="submit">
            Create product
          </button>
        </form>

        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-300">
          <h2 className="text-lg font-medium text-white">Vault rules</h2>
          <p>Products stay in draft until compliance profiles and affiliate links are valid.</p>
          <p>Every create action generates a manual review task for compliance profile review.</p>
          <p>All product fields should remain owner-controlled and auditable.</p>
        </aside>
      </section>
    </main>
  );
}
