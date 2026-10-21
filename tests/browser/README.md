# Admin browser checks

Run `npm run test:browser` from the repository root. The runner builds the actual Inspector components into a standalone fixture and starts a local static server. Playwright intercepts all `/api/` requests with synthetic records. These checks do not add an app route, authenticate against Neon, or operate production accounts.

`admin-navigation.cjs` checks analytics, queues, themes, URL selection, responsive widths and mobile navigation. `admin-workflows.cjs` checks pagination/search, draft protection, conflict reload, reauth cancellation, announcement edits, ticket retry prevention, CMS publication/rollback and settings.

Windows defaults to the installed Edge channel. Other platforms need `npx playwright install chromium`; `CCS_BROWSER_CHANNEL` overrides the installed channel. Generated fixtures and screenshots remain under ignored `.browser-artifacts/` for visual inspection.

Database/authentication/transaction behavior is covered separately by `npm run test:admin`; browser fixture results do not replace an authenticated deployed preview journey.

## Public routing

Run `npm run build` followed by `npm run test:routing`. This starts the actual production Next app on port 3113 and intercepts every API with synthetic responses. It verifies Back/Forward and the previous-site history boundary, shell/session persistence, direct post/profile/auth links, loading without a landing-screen flash, protected-route session checks, and late profile/login response races. No hosted accounts or database writes are used. Set `CCS_ROUTING_BASE_URL` to test an already running local build instead.

The routing suite also checks faculty titles alongside staff roles in the full visited profile, hover preview and authenticated self profile. `npm run test:profile` covers every supported faculty-title/staff-role combination plus missing/invalid title behavior.
