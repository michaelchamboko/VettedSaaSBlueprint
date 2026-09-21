export default function ProgramResourcesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold">PartnerStack Program Resources</h1>
        <p className="mt-3 text-sm text-slate-300">
          Intake PDFs, screenshots, links, and notes for each offer folder so the local automation can later analyse them into draft rules.
        </p>
      </header>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6" method="post" action="/api/admin/program-resources">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Offer folder ID</span>
              <input name="offer_folder_id" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Resource type</span>
              <select name="resource_type" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white">
                <option value="note">Note</option>
                <option value="link">Link</option>
                <option value="pdf">PDF</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label className="space-y-2 text-sm block">
              <span className="block text-slate-200">Title</span>
              <input name="title" type="text" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Source URL</span>
              <input name="source_url" type="url" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Storage URL</span>
              <input name="storage_url" type="url" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm block md:col-span-2">
              <span className="block text-slate-200">Notes</span>
              <textarea name="notes" rows={4} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
            </label>
          </div>
          <button className="rounded bg-white px-4 py-2 text-sm font-medium text-slate-950" type="submit">
            Save program resource
          </button>
        </form>

        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-300">
          <h2 className="text-lg font-medium text-white">Resource intake rules</h2>
          <p>Program resources keep manual notes, source links, and storage pointers in application metadata.</p>
          <p>Extracted rules stay in draft or review state until the owner approves them.</p>
          <p>Large files can point to approved object storage instead of database storage.</p>
        </aside>
      </section>
    </main>
  );
}
