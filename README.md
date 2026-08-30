# Vetted SaaS Blueprint

Vetted SaaS Blueprint is a repository-driven affiliate content site built with Next.js and deployed to Vercel. Public pages are generated and maintained in this repository; the deployed application does not require a database, hosted worker, queue, or admin runtime.

## Operating model

- Research and content generation run locally on the operator's computer.
- Scrapling may gather source material locally during the research stage.
- Generated pages, evidence, and approved affiliate destinations are stored in the repository.
- Vercel builds and serves the committed Next.js application.
- Affiliate CTA destinations must exactly match an entry in `approved-urls.md`.

## Repository map

- `src/app` - Next.js App Router pages, metadata, sitemap, robots, and public routes.
- `src/components` - shared public-site and landing-page components.
- `src/generated` - generated content and landing-page release artifacts.
- `src/lib` - content contracts, validation, research, and publication helpers.
- `scripts` - local generation, validation, and deployment verification commands.
- `tests` - unit, contract, quality, and regression coverage.
- `.agents/skills` - repository-specific content and review skills.
- `approved-urls.md` - authoritative affiliate destination allowlist.

## Local development

```powershell
npm ci
npm run dev
```

The local application is available at `http://localhost:3000` by default.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Use the narrower scripts in `package.json` when validating a specific content batch or live deployment.

## Deployment

Vercel is the production runtime. Connect `michaelchamboko/VettedSaaSBlueprint` to the Vercel project for `https://vettedsaasblueprint.online/` and deploy the intended Git revision. Keep research tooling local; only the built Next.js application runs on Vercel.
