# SEO and Discoverability

The public site is optimized for search and social sharing without exposing
short links or application pages. English is the only content language for the
current MVP. A custom domain can replace the temporary `vercel.app` origin
without changing page metadata.

## Public pages

| Page                  | Search intent                                      |
| --------------------- | -------------------------------------------------- |
| `/`                   | Brand and broad short-link product queries          |
| `/url-shortener`      | Free URL shortener, short link generator            |
| `/qr-code-generator`  | QR codes for short links, downloadable QR PNGs      |
| `/link-analytics`     | Short-link click analytics, privacy-friendly counts |
| `/faq`                | Product, account, QR, and analytics questions       |
| `/about`              | Product background and principles                   |
| `/privacy`            | Data handling and analytics scope                   |
| `/terms`              | Service rules and acceptable use                    |

All public pages are server-rendered, use one `<h1>`, include a unique title,
description, canonical URL, Open Graph and Twitter metadata, and appear in
`sitemap.xml`. The home page and FAQ also publish JSON-LD structured data.

## Indexing policy

| Surface                          | Policy                                      |
| -------------------------------- | ------------------------------------------- |
| Public marketing pages           | Indexable                                   |
| `/login`                         | `noindex, nofollow` metadata and header     |
| `/dashboard`                     | `noindex, nofollow` header; redirects guests |
| `/prototype/*`                   | `noindex, nofollow` header                  |
| `/api/*`                         | Disallowed in `robots.txt`                  |
| `/<code>` short links            | `X-Robots-Tag: noindex, nofollow`, no-store |
| Unknown or disabled short links  | `noindex, nofollow` unavailable page        |

Short links deliberately redirect with `302` and are never added to the
sitemap. Do not add them to search indexes or social previews.

## Implementation

- `apps/web/src/lib/brand.ts` contains the brand name, public navigation, and
  repository links.
- `apps/web/src/lib/site.ts` resolves the canonical origin and builds absolute
  URLs. `NEXT_PUBLIC_SITE_URL` wins, then Vercel's production hostname, then
  `https://elvo-links.vercel.app`.
- `apps/web/src/lib/seo.ts` creates shared page metadata.
- `apps/web/src/app/layout.tsx` owns the metadata base, title template, robots
  defaults, verification tags, manifest, and viewport colors.
- `apps/web/src/app/(marketing)/` contains the public pages and marketing
  layout. The route group keeps URLs at the root.
- `apps/web/src/app/robots.ts`, `sitemap.ts`, and `manifest.ts` generate crawler
  and browser metadata.
- `apps/web/src/app/opengraph-image.tsx`, `twitter-image.tsx`, `icon.svg`, and
  `apple-icon.tsx` provide share images and icons at build time.
- `apps/web/src/components/marketing/` contains the CTA, FAQ, page intro, and
  legal page primitives.
- `apps/web/next.config.ts` adds noindex headers for app-only routes.
- `apps/web/src/app/[code]/route.ts` adds noindex and no-store headers to
  short-link redirects.
- `apps/server/src/links/routes.ts` applies the same headers on the internal
  server redirect path.

`RESERVED_LINK_CODES` in `apps/server/src/links/domain.ts` includes the public
page names so generated codes cannot collide with application routes.

## Configuration

| Variable                   | Where       | Purpose                                      |
| -------------------------- | ----------- | -------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`     | Web service | Canonical origin for metadata and sitemap    |
| `GOOGLE_SITE_VERIFICATION` | Web service | Google Search Console HTML verification token |
| `BING_SITE_VERIFICATION`   | Web service | Bing Webmaster Tools `msvalidate.01` token   |

These are optional. Without `NEXT_PUBLIC_SITE_URL`, the site uses the Vercel
production hostname or the current public fallback. Verification tags are
omitted until their tokens are configured. Environment values are applied
during the build, so redeploy after changing them.

## Search Console and Bing

1. Add a URL-prefix property in Google Search Console for the current public
   origin, for example `https://elvo-links.vercel.app/`.
2. Choose HTML tag verification, copy the `content` token, and set
   `GOOGLE_SITE_VERIFICATION` on the Vercel web service for Production.
3. Redeploy, then complete verification in Search Console.
4. Submit `https://elvo-links.vercel.app/sitemap.xml`.
5. Use URL Inspection to request indexing for `/`, `/url-shortener`,
   `/qr-code-generator`, `/link-analytics`, and `/faq`.
6. In Bing Webmaster Tools, add the same site and either import it from Google
   Search Console or set `BING_SITE_VERIFICATION` and redeploy.

Do not submit short links, login, dashboard, prototype, or API URLs.

## Custom domain migration

When a custom domain is ready:

1. Add the domain to the Vercel project and make it the primary production
   domain. Keep a redirect from the old `vercel.app` host.
2. Set `NEXT_PUBLIC_SITE_URL` to the new HTTPS origin on the web service.
3. Update `BETTER_AUTH_URL`, `CORS_ORIGIN`, and (if set) `PUBLIC_WEB_ORIGIN` on
   the server service to the new origin.
4. Add the new Google OAuth callback URI:
   `https://<domain>/api/auth/callback/google`.
5. Redeploy and verify signatures, links, QR codes, and analytics.
6. Add the new origin as a Search Console property, submit the new sitemap,
   and keep the old property verified during the transition.

## Verification

Run both dev servers, then from `apps/server`:

```bash
bun run verify:seo
```

The script checks public page metadata, canonical paths, Open Graph and Twitter
tags, JSON-LD, `robots.txt`, `sitemap.xml`, the manifest, generated images,
noindex protections for login/dashboard, and short-link redirect headers. It
creates and removes a temporary link for the redirect checks.

Production spot checks:

```bash
curl -I https://elvo-links.vercel.app/<code>
curl -s https://elvo-links.vercel.app/robots.txt
curl -s https://elvo-links.vercel.app/sitemap.xml
```

The first command should return `302` with `X-Robots-Tag: noindex, nofollow`
and `Cache-Control: no-store`.

## Launch checklist

- Keep the live URL linked from the GitHub repository and use the same URL in
  relevant product profiles or directories.
- Prefer a small number of genuine listings over bulk directory submissions or
  paid link schemes.
- Monitor Search Console coverage and query data after launch.
- Update metadata, `sitemap.ts`, and internal links whenever a public page is
  added or removed.
- Re-run `verify:seo`, `check-types`, and the build before deploying SEO changes.

## Current limitations

- The canonical origin is the temporary `elvo-links.vercel.app` deployment.
- There is no blog or editorial content plan in the current scope.
- The contact fallback is the public GitHub issue tracker; no dedicated privacy
  email is configured yet.
- Account deletion is not self-service in the MVP.
- Short links are intentionally excluded from search and social indexing.
