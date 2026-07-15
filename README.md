# KFY SMART V3 Website Package

GitHub-ready static B2B website package for **KFY SMART V3**.

## Included

- Home page with accessible 3-slide responsive Hero carousel
- Products overview
- 3 product category pages
- 12 product detail pages
- News overview and 5 initial articles
- About, Contact, Terms of Use and 404 pages
- WebP/SVG final assets only
- Vercel serverless inquiry endpoint using Resend
- Sitemap, robots.txt, canonical URLs and structured data

## Important default

The public inquiry form is **disabled by default** because the Privacy Policy is not yet published. Direct WhatsApp and email contact remain available. To test the form on a protected Preview deployment, change:

```js
window.KFY_CONFIG={inquiryFormEnabled:true,assetBaseUrl:''};
```

in `assets/js/site-config.js`, then configure Vercel environment variables from `.env.example`.

## GitHub + Vercel

1. Create a `v3-preview` branch in the existing repository.
2. Upload the contents of this package to that branch.
3. Import/connect the repository in Vercel, or let the existing Vercel project build the branch.
4. Review the generated Preview URL.
5. Merge to the production branch only after approval.

This is a static site; no build command is required. Vercel will also deploy `api/inquiry.js` as a serverless function.
