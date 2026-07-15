# Cloudflare R2 Migration Guide

The V3 package currently includes local WebP/SVG assets so GitHub and Vercel Preview can work immediately.

After Cloudflare DNS and R2 are ready:

1. Upload the contents under `assets/images/` to the R2 bucket, preserving paths.
2. Bind the production custom domain `assets.kfysmart.com` to the bucket.
3. Update image URLs in the HTML from `/assets/images/...` to `https://assets.kfysmart.com/...`.
4. Keep Logo and small SVG interface icons in the GitHub repository.
5. Do not expose R2 access keys in client-side code.
6. Validate CORS, cache headers and every product image before switching Production.

A separate `KFY_SMART_V3_R2_Assets.zip` and `r2-assets-manifest.json` are provided.
