# KFY SMART B2B Website Package

This is a static website package for **KFY SMART**, designed in a blue business style for smart living and smart sleep B2B use.

## What is included

- `index.html` — homepage
- `products.html` — product center
- `oem-odm.html` — OEM/ODM page
- `solutions.html` — business scenarios
- `technology.html` — smart control and sleep technology
- `partner.html` — partner recruitment page
- `support.html` — download center and FAQ
- `about.html` — about page
- `contact.html` — inquiry form and quick contact
- Original SVG logo and product visuals under `assets/images/`
- Blue business style CSS under `assets/css/styles.css`
- Simple JS for menu, FAQ and product filters under `assets/js/main.js`

## Before production

Replace these placeholders:

1. WhatsApp phone number: search `8613800000000`
2. Email address: search `sales@kfysmart.com`
3. LinkedIn company URL: search `https://www.linkedin.com/company/`
4. Demo product/case text with real product specs and real projects
5. Demo downloads in `/downloads/` with real PDFs or Cloudflare R2 URLs
6. Legal company name, privacy policy and terms

## Deploy to GitHub + Vercel

1. Create a GitHub repository, for example `kfy-smart-website`.
2. Upload all files in this folder to the repository root.
3. Import the GitHub repository into Vercel.
4. In Vercel, add your domain, such as `www.kfysmart.com`.
5. In Cloudflare DNS, follow Vercel's DNS instructions.

## Cloudflare R2 suggestion

Use R2 for large files such as product images, product catalogs, manuals and certification files. Suggested public asset domain:

`assets.kfysmart.com`

Then replace local download/image URLs with R2 public URLs when ready.
