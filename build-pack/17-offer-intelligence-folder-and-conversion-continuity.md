# 17 — Offer Intelligence Folder and Conversion Continuity

## Purpose

Every affiliate offer needs a single Oracle-owned folder/record that links the product, affiliate URL, research, uploaded resources, extracted rules, evidence, purchase destination review, and landing-page design guidance.

This avoids treating the affiliate link as a loose URL. The affiliate link is the conversion destination, so the system must understand the destination page before building the pre-sell landing page.

## Recommended Term

Use **conversion continuity** as the internal product term.

Conversion continuity combines:

- **Information scent**: the user sees cues that tell them the next click will lead where they expect.
- **Message match**: the promise, CTA wording, offer framing, and problem language stay consistent across the pre-sell page and purchase page.
- **Visual congruence**: the landing page feels related to the purchase destination without copying or impersonating it.
- **Expectation alignment**: the user is not surprised by pricing, trial language, checkout steps, or the vendor brand after clicking.
- **Trust transfer**: confidence built on the landing page carries into the affiliate destination.

## Offer Intelligence Folder Model

Each offer should have an `offer_folder` concept in Oracle.

```text
offer_folder
- id
- product_id
- primary_affiliate_link_id
- folder_slug
- storage_root
- status
- created_at
- updated_at
```

Linked records:

```text
offer_folder_resources
- uploaded PDFs
- images/screenshots
- manual notes
- source links
- video references/uploads
- PartnerStack terms/resources

offer_folder_rules
- extracted required disclosure
- allowed/disallowed channels
- paid-ad rules
- coupon/deal rules
- brand/trademark restrictions
- deep-link/custom-link permissions
- self-referral policy

offer_folder_research
- affiliate research sources
- evidence claims
- pain points
- objections
- competitor notes

offer_purchase_destination_review
- affiliate URL tested
- redirect chain observed
- final visible destination recorded for review only
- purchase page screenshots/extractions
- offer promise and CTA language
- pricing/trial/guarantee claims
- checkout/signup friction notes
- visual affinity profile
- conversion continuity score
```

Important: the original affiliate URL remains the outbound URL. The final redirected URL may be stored for review/audit only and must not replace the affiliate link.

## Purchase Destination Review

Before a landing page is drafted or approved, Hermes should review the page the user reaches after clicking the affiliate link.

Review dimensions:

1. **Message continuity**
   - Does the purchase page use the same offer language?
   - Is the CTA label compatible with our CTA?
   - Are trial/demo/pricing claims consistent?

2. **Visual continuity**
   - Dominant color family.
   - Typography mood.
   - Button shape and CTA prominence.
   - Page density and pacing.
   - Screenshot/product-demo style.

3. **Trust continuity**
   - Security/trust cues visible on destination.
   - Refund/guarantee/trial terms if present.
   - Brand legitimacy cues.
   - Any mismatch that could create doubt.

4. **Friction review**
   - Number of steps to signup/purchase.
   - Required fields.
   - Account creation expectations.
   - Payment timing.
   - Surprise pricing or plan selection.

5. **Compliance review**
   - Do not claim discounts, guarantees, free trials, ratings, or urgency unless visible and evidenced.
   - Do not copy vendor design or assets unless permitted.
   - Do not impersonate the vendor.
   - Keep affiliate disclosure visible on our page before CTA.

## Landing Page Design Guidance

The landing page should not be a pixel clone of the destination page. It should create **visual affinity** and expectation continuity.

Allowed:

- Similar color mood or accent family.
- Similar CTA vocabulary if accurate.
- Similar product category language.
- Compatible section rhythm and emotional tone.
- Matching expectations about next step: demo, trial, pricing, signup, purchase.

Not allowed:

- Copying protected layouts or brand assets without permission.
- Hiding affiliate relationship.
- Fake trust marks, testimonials, ratings, or urgency.
- Making the destination feel like a different offer than the one promised.

## Psychology / UX Basis

- Information scent explains how users decide whether a click is likely to satisfy their goal. If our CTA and surrounding context clearly preview the purchase destination, users are less likely to feel misled or bounce.
- Landing-page relevance matters: Google describes landing page experience in terms of relevance and usefulness to the person who clicked.
- Visual quality matters, but it must support function: the aesthetic-usability effect means appealing design can increase perceived usability, but it cannot compensate for major friction or mismatch.

## Reference Links

- Nielsen Norman Group: Information Scent — https://www.nngroup.com/articles/information-scent/
- Nielsen Norman Group: Aesthetic-Usability Effect — https://www.nngroup.com/articles/aesthetic-usability-effect/
- Google Ads Help: Landing page experience — https://support.google.com/google-ads/answer/2404197

## System Rule

A direct-review landing page should not be published until the linked affiliate destination has a current purchase destination review or an explicit owner override.
