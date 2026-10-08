
- Single plan: `plan_type` is always `optiflow` (DB CHECK enforces it); legacy values are normalized client- and server-side so old caches never restrict features.
- Navigation: `src/config/appNavigation.ts` is the single source for authenticated business navigation so desktop, mobile, and home access rules cannot drift.
