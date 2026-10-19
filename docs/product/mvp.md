# Elvo Links MVP

Status: confirmed by the product owner on 2026-10-19. This describes the target product, not completed functionality.

- Brand: Elvo
- Product: Elvo Links
- Project title: Elvo — Minimal URL Shortening Platform
- Tagline: Short Links. Clean Experience.

## Audience and Access

A free public service for individuals, with personal accounts and Google-only sign-in. Creating and managing links requires authentication; public redirects do not. Teams, billing, and email/password sign-in are outside the MVP.

## Short Links

- Generate a unique link code automatically; custom slugs and code changes are outside scope. Code length and alphabet remain implementation choices.
- Use the same public domain for the website and short links (`/<code>`); configure the actual domain before launch. `elvo.link` is an illustrative name, not a selected or verified domain.
- Accept only HTTP/HTTPS destinations. Redirect immediately with HTTP 302.
- Owners may set an optional title, edit the destination, and enable or disable their own links.
- No expiration or permanent deletion in the MVP.
- Limit each account to 100 created links, including disabled and suspended links, and at most 10 creations per minute. Existing destinations remain editable at the account limit.
- Show newest links first. Search by title or URL; provide copy, QR download, enable/disable, and analytics actions.
- Unknown, disabled, or suspended links show “Link unavailable” with a home link, without exposing the destination or owner.

## QR Codes

Provide black-and-white PNG downloads encoding the short URL. Destination edits preserve the short URL and existing QR codes.

## Click Analytics

- Record successful redirect responses, including repeat requests and bots; do not claim to measure destination loads or unique visitors.
- Show lifetime total clicks and a daily chart for the latest 30 UTC calendar days.
- Retain lifetime totals and only the latest 30 days of daily aggregates.
- Update analytics within one minute. Recording failure must not prevent redirects; recorded counts may consequently undercount.
- Collect no visitor IP addresses or identifying visitor data for analytics. Country, device, referrer, unique-visitor reporting, and bot filtering are outside scope.

## Administration

Configure administrator accounts on the server. Provide a basic interface to search and suspend links or accounts. Account suspension stops all of that account's redirects. Owners cannot lift administrator suspensions.

## Experience and Completion

Use English UI, a minimal spacious layout, mobile support, and system-aware light/dark themes.

The MVP is complete when a new user can sign in with Google, create a short link, download its QR code, share it, and return to view click analytics on mobile. Verify destination editing, disabled/suspended behavior, quotas, ownership enforcement, and administrative access as part of this flow.

## Existing Implementation Gap

At the time of documentation, the scaffold enables email/password authentication in `packages/auth/src/index.ts` and uses an email/password sign-in form. Google-only authentication and the product flows above remain implementation work.
