# KFY SMART V3.1 Website Package

Static website package for GitHub + Vercel deployment.

## Included
- Home, Products, 3 category pages, 12 product pages
- News index + 5 articles
- About, Contact, Terms of Use and 404
- Final approved WebP/SVG assets
- Vercel Function inquiry endpoint (disabled in production UI by default)

## Local check
```bash
npm run check
```

## Local preview
```bash
npm run dev
```

## Deployment
1. Upload the contents of this folder to a new GitHub branch, recommended: `v3-1-rebuild`.
2. Import or redeploy the GitHub repository in Vercel.
3. Keep the production inquiry form disabled until Privacy Policy, Resend domain verification and a real send/receive test are complete.
4. Verify 1920, 1440, 1024, 768 and 390 px viewports before production.

## Form variables (only when enabling)
- `RESEND_API_KEY`
- `INQUIRY_TO_EMAIL=liwei@kfygroup.com`
- `INQUIRY_FROM_EMAIL=<verified sender>`

The `reference/` folder is excluded from Vercel by `.vercelignore`.
