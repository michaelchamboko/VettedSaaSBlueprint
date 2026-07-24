export default function ResearchLedgerPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold">Research and Evidence Ledger</h1>
        <p className="mt-3 text-sm text-slate-300">
          Record sources, claims, usage permission, and review state before anything becomes page copy or a publishable claim.
        </p>
      </header>
      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <form className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6" method="post" action="/api/admin/research-sources">
          <h2 className="text-lg font-medium text-white">Research Source</h2>
          <input name="source_type" placeholder="manual_note" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
          <input name="source_url" type="url" placeholder="https://example.com/source" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
          <input name="source_title" placeholder="Source title" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
          <textarea name="notes" rows={3} placeholder="Notes" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
          <button className="rounded bg-white px-4 py-2 text-sm font-medium text-slate-950" type="submit">Save source</button>
        </form>
        <form className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6" method="post" action="/api/admin/evidence-claims">
          <h2 className="text-lg font-medium text-white">Evidence Claim</h2>
          <input name="claim_text" placeholder="Claim text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
          <input name="claim_type" placeholder="pricing" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
          <input name="risk_level" placeholder="medium" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
          <input name="source_id" placeholder="Optional source ID" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
          <textarea name="source_summary" rows={3} placeholder="Source summary" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
          <button className="rounded bg-white px-4 py-2 text-sm font-medium text-slate-950" type="submit">Save claim</button>
        </form>
      </section>
    </main>
  );
}
