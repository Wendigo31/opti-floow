
- Single plan: `plan_type` is always `optiflow` (DB CHECK enforces it); legacy values are normalized client- and server-side so old caches never restrict features.
- Navigation: `src/config/appNavigation.ts` is the single source for authenticated business navigation so desktop, mobile, and home access rules cannot drift.

- Security (open redirect): never pass a path taken from the URL, a query parameter, storage or any user input to `navigate()`, `<Link to>`, `<Navigate to>` or `window.location` without validating it first. Accept only same-origin absolute paths: must start with a single `/`, and must not start with `//` or `/\\` (see `getRedirectTarget` in Globr `src/lib/auth-redirect.ts` for the reference implementation). Fall back to `/` otherwise.
