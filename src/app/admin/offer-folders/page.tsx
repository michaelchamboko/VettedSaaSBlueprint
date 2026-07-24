export default function OfferFoldersPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold">Offer Intelligence Folder</h1>
        <p className="mt-3 text-sm text-slate-300">
          Each offer folder binds the product, primary affiliate link, and the compliance trail that will later carry resources, evidence, and review state.
        </p>
      </header>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6" method="post" action="/api/admin/offer-folders">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Folder name</span>
              <input name="name" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Product ID</span>
              <input name="product_id" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Primary affiliate link ID</span>
              <input name="affiliate_link_id" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Status</span>
              <select name="status" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <button className="rounded bg-white px-4 py-2 text-sm font-medium text-slate-950" type="submit">
            Create offer folder
          </button>
        </form>

        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-300">
          <h2 className="text-lg font-medium text-white">Folder contract</h2>
          <p>Offer folders are the organizing unit for resources, rules, evidence, purchase review, and page drafts.</p>
          <p>The original affiliate URL remains the outbound purchase URL; review data is for audit only.</p>
          <p>Orphaned offer records should not be created because the product and primary affiliate link are required.</p>
        </aside>
      </section>
    </main>
  );
}
