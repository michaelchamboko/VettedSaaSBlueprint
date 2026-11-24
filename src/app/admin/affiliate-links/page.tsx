import { AdminFormPage } from "@/components/admin/AdminFormPage";

export default function AffiliateLinksPage() {
  return (
    <AdminFormPage
      title="Affiliate Link Vault"
      description="Store the original approved referral URL separately from the destination URL and preserve the link provenance."
      asideTitle="Vault rules"
      asideItems={[
        "Only approved original referral URLs are accepted (PartnerStack, psref, or Flowith).",
        "Destination URLs stay separate so the source referral remains auditable.",
        "Changes should create review or audit records for traceability.",
      ]}
    >
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
              <span className="block text-slate-200">Original referral URL</span>
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

    </AdminFormPage>
  );
}
