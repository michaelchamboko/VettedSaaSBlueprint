import assert from "node:assert/strict";
import test from "node:test";

import { trendReports } from "@/lib/trends/trend-reports";

test("the trend catalogue publishes exactly three reports", () => {
  assert.equal(trendReports.length, 3);
  const slugs = trendReports.map((report) => report.slug);
  assert.deepEqual(slugs, ["ai-agents", "saas-pricing", "ai-native-vs-bolt-on"]);
});

test("each trend report has a unique canonical path derived from its slug", () => {
  const paths = new Set(trendReports.map((report) => report.canonicalPath));
  assert.equal(paths.size, trendReports.length);
  for (const report of trendReports) {
    assert.equal(report.canonicalPath, `/trends/${report.slug}`);
  }
});

test("every finding cites a source that exists in the same report", () => {
  for (const report of trendReports) {
    const sourceIds = new Set(report.sources.map((source) => source.id));
    assert.ok(report.sources.length > 0);
    for (const finding of report.findings) {
      assert.ok(finding.sourceIds.length > 0, `finding without sources in ${report.slug}`);
      for (const id of finding.sourceIds) {
        assert.ok(sourceIds.has(id), `unknown source id ${id} in ${report.slug}`);
      }
    }
  }
});

test("every trend source is an HTTPS reference with an access date", () => {
  for (const report of trendReports) {
    for (const source of report.sources) {
      assert.ok(source.url.startsWith("https://"), `insecure source url in ${report.slug}`);
      assert.match(source.accessedAt, /^\d{4}-\d{2}-\d{2}$/);
      if (source.publishedAt) {
        assert.match(source.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
      } else {
        assert.ok(source.note, `undated source needs a note: ${source.id}`);
      }
    }
  }
});

test("affiliate action routes only through vetted review pages, never raw destinations", () => {
  const reviewPathPattern = /^\/(landing-page-builders|getresponse-studio)\/?[a-z0-9-]*$/;
  for (const report of trendReports) {
    assert.ok(report.relatedReviews.length >= 2, `report without related reviews: ${report.slug}`);
    for (const review of report.relatedReviews) {
      assert.match(review.reviewPath, reviewPathPattern);
      assert.ok(!review.reviewPath.includes("://"));
    }
    const serialized = JSON.stringify(report);
    assert.ok(
      !/https?:\/\/(get\.carepatron|get\.datahawk|try\.elevenlabs|free-trial\.adcreative|partners\.snowfire|trymoo\.moosend|try\.getresponsetoday)/i.test(serialized),
      `raw affiliate destination found in trend report ${report.slug}`,
    );
  }
});

test("trend reports state evidence boundaries and are free of affiliate links", () => {
  for (const report of trendReports) {
    assert.ok(report.boundaries.length >= 3);
    const serialized = JSON.stringify(report);
    assert.ok(!serialized.includes("PartnerStack"), "affiliate tracking must not appear");
    for (const source of report.sources) {
      assert.ok(!source.url.includes("partners."), "no affiliate destination in sources");
    }
  }
});
