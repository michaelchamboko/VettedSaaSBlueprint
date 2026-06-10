export default function AffiliateDisclosurePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <a className="text-sm text-[var(--accent)]" href="/">
        Back to dashboard
      </a>
      <h1 className="mt-8 text-4xl font-bold">Affiliate Disclosure</h1>
      <div className="mt-6 space-y-5 text-base leading-7 text-slate-300">
        <p>
          GlobalSetup may earn a commission when a visitor clicks an affiliate
          link and later buys or signs up through the official partner site.
        </p>
        <p>
          Affiliate relationships do not allow unsupported rankings, invented
          usage claims, fake urgency, or hidden offer terms. Public landing
          pages must preserve the original referral link and show an in-page
          disclosure before or near the first affiliate CTA.
        </p>
        <p>
          Pricing, trial, refund, security, integration, and comparison claims
          require current evidence and manual review before publication.
        </p>
      </div>
    </main>
  );
}
