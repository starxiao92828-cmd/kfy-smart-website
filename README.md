# KFY SMART Website

KFY SMART is a static B2B smart-sleep website deployed through GitHub and Vercel.

## Website

Primary navigation: Products, News, About and Contact.

Product lines:

- Adjustable Bed Bases
- Smart Beds
- Smart Mattresses

News is an actively growing content library.

The Contact form is active. Its source of truth is:

- `contact/index.html`
- `assets/js/contact-form.js`
- `api/contact.js`

## Local commands

```bash
npm run check
npm run dev
```

## Normal workflow

1. Fetch the latest `origin/main`.
2. Create a narrow feature branch.
3. Push the branch and verify the Vercel Preview.
4. Complete scoped QA.
5. Fast-forward or otherwise approved-merge to `main`.
6. Verify the automatic Production deployment.
