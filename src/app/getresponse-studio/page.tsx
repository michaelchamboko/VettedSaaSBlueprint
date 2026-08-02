import type { Metadata } from "next";
import Link from "next/link";

import styles from "./page.module.css";

const affiliateUrl = "https://try.getresponsetoday.com/smypvzu98eko-kfze15";

export const metadata: Metadata = {
  title: "GetResponse, in motion | VettedSaaSBlueprint",
  description: "A concise visual fit check for teams exploring lifecycle automation in GetResponse.",
  robots: { index: false, follow: false },
};

export default function GetResponseStudioPage() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brand}>VettedSaaSBlueprint</Link>
        <span>GetResponse / studio brief</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.kicker}>Lifecycle automation</p>
          <h1>Make the next message feel inevitable.</h1>
          <p className={styles.lede}>
            GetResponse is worth a look when your team needs one clear path from a subscriber signal to a useful follow-up.
          </p>
          <a className={styles.cta} href={affiliateUrl} rel="nofollow sponsored">
            Explore GetResponse <span aria-hidden="true">↗</span>
          </a>
          <p className={styles.disclosure}>We may earn a commission if you use this link, at no extra cost to you.</p>
        </div>
        <figure className={styles.artwork}>
          <img
            src="/generated/getresponse-studio-journey.png"
            alt="Blue ribbon moving through translucent coral and yellow panels"
          />
        </figure>
      </section>

      <section className={styles.checks} aria-label="Fit check">
        <article><span>01</span><h2>Signal</h2><p>Choose the behavior that deserves a response.</p></article>
        <article><span>02</span><h2>Audience</h2><p>Confirm the data that separates that moment from the rest.</p></article>
        <article><span>03</span><h2>Follow-up</h2><p>Inspect the workflow controls before committing a wider journey.</p></article>
      </section>

      <footer className={styles.footer}>
        <p>Check current product options and terms on the official GetResponse destination.</p>
        <nav aria-label="Trust links"><Link href="/affiliate-disclosure">Disclosure</Link><Link href="/editorial-policy">Editorial policy</Link><Link href="/privacy">Privacy</Link></nav>
      </footer>
    </main>
  );
}
