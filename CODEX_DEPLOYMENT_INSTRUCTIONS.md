# KFY SMART Maintenance Workflow

## Baseline and branching

1. Always fetch `origin/main` before starting work.
2. If the expected SHA differs, stop and report it. Never overwrite or blindly merge concurrent work.
3. Create a narrow feature branch from the current clean `main`.

## Validation and release

1. Run `npm run check`.
2. Validate only the scope relevant to the task; do not scan or modify unrelated areas unnecessarily.
3. Push the feature branch and complete Preview QA before Production.
4. Never merge or deploy Production unless explicitly approved.

## Sitemap lastmod policy

Update `sitemap.xml` lastmod when a task changes primary page content, product or article facts, structured data, meaningful internal links, or significant legal/entity information. Do not update lastmod for CSS-only changes, image optimization without semantic change, formatting-only changes, copyright-year-only changes, or repository documentation changes.

For significant HTML updates, run:

```bash
npm run sitemap:touch -- <changed-html-paths>
```

For an explicit historical date, run:

```bash
npm run sitemap:touch -- --date=YYYY-MM-DD <paths>
```

Do not manually set all sitemap entries to today's date.

## Current source of truth

- Contact: `contact/index.html`, `assets/js/contact-form.js`, `api/contact.js`
- Products: current product and category HTML pages
- News: current article HTML pages, `news/index.html`, and `sitemap.xml`
- Entity: KFY SMART; legal name: Anhui Care For You Network Technology Co., Ltd.

Do not revive deleted legacy JSON/data snapshots or the retired inquiry endpoint.
