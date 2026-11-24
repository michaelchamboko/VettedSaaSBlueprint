import { AdminFormPage } from "@/components/admin/AdminFormPage";

export default function ProgramResourcesPage() {
  return (
    <AdminFormPage
      title="PartnerStack Program Resources"
      description="Intake PDFs, screenshots, links, and notes for each offer folder so the local automation can later analyse them into draft rules."
      asideTitle="Resource intake rules"
      asideItems={[
        "Program resources keep manual notes, source links, and storage pointers in application metadata.",
        "Extracted rules stay in draft or review state until the owner approves them.",
        "Large files can point to approved object storage instead of database storage.",
      ]}
    >
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

    </AdminFormPage>
  );
}
