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

## Current source of truth

- Contact: `contact/index.html`, `assets/js/contact-form.js`, `api/contact.js`
- Products: current product and category HTML pages
- News: current article HTML pages, `news/index.html`, and `sitemap.xml`
- Entity: KFY SMART; legal name: Anhui Care For You Network Technology Co., Ltd.

Do not revive deleted legacy JSON/data snapshots or the retired inquiry endpoint.
