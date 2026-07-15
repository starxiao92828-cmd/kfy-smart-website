# KFY SMART V3 Deployment Guide

## Recommended release flow

1. Keep the current V2 production branch and deployment unchanged.
2. Create a Git branch named `v3-preview`.
3. Upload this package to `v3-preview`.
4. Confirm Vercel creates a Preview deployment.
5. Test at 1920, 1440, 1024, 768 and 390 px widths.
6. Confirm all 12 products, images, links, SEO files and legal page.
7. Keep the inquiry form disabled until a Privacy Policy is published.
8. After approval, merge `v3-preview` into the production branch.

## Vercel settings

- Framework preset: Other
- Build command: leave empty
- Output directory: leave empty / repository root
- Install command: leave empty

## Environment variables for form testing

- `RESEND_API_KEY`
- `INQUIRY_TO_EMAIL=liwei@kfygroup.com`
- `INQUIRY_FROM_EMAIL=<verified sender>`

## Rollback

Record the V2 production commit and deployment before merging. If V3 has a critical problem, restore the V2 commit or use Vercel Instant Rollback.
