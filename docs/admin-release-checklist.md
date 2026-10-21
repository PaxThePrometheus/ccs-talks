# Admin release checklist

Updated 21 October 2026. See [remediation roadmap](admin-remediation-plan.md) for scope and remaining acceptance checks.

## Verified

- Configured hosted Neon database upgraded transactionally with additive integrity, versioning and conversation migrations. Actual version columns were checked after the v2 drift repair; the ledger alone is insufficient.
- Account count 10 and active-admin count 2 preserved; credential/role fingerprint unchanged. No administrators re-created, passwords reset or legacy orphan posts deleted.
- Disposable PostgreSQL tests exercise required-audit rollback, foreign keys/cascades, report evidence, comment counts, role/session/MFA boundaries, stale-write conflicts, strict route inputs, policy enforcement, retries and workflow history.
- Browser fixtures exercise admin navigation, analytics, theme, server search/pagination, protected drafts, conflict reload, reauth cancellation, announcement changes, ticket duplicate prevention, CMS publication/restore and narrow viewports. Fixtures do not substitute for a hosted authenticated journey.
- App source is local. The database upgrade is applied; no Git push or Vercel deployment is implied.
- Final local checkpoint: 20 admin tests and 2 public-loading/profile-contract tests passed, both browser suites passed, and the production build passed. Targeted lint reported zero errors and six warnings; repository-wide lint still has the existing public-app baseline failures. Desktop dark-mode overview and mobile settings screenshots were visually checked.

## Repeatable local checks

Run `npm run test:admin`, `npm run test:performance`, `npm run test:browser`, `npm run build` and `npm run test:routing`. The first two commands currently cover 22 tests in total, including a stale-ledger repair case. Browser fixtures use only synthetic accounts and intercept API traffic; screenshots/bundles are written under ignored `.browser-artifacts/`.

On Windows, browser checks use installed Edge by default. On other platforms, install Chromium with `npx playwright install chromium`. Override `CCS_BROWSER_CHANNEL` when a different installed browser channel is needed.

Production-mode local HTTP smoke checks against the configured Neon database verify public landing/feed responses and anonymous rejection of admin endpoints. Warm local landing samples were approximately 250 ms; a first request was approximately 2.5 s. These are individual local observations, not Vercel production latency percentiles.

The public routing regression additionally runs against the production Next app with intercepted APIs. It verifies server-rendered deep links, Back/Forward, the previous-site history boundary, a persistent session/shell, protected-route redirects, profile-to-self navigation, and delayed response races without a landing-screen flash.

## Before app deployment

- Confirm the target Vercel environment uses the upgraded database. For another database, run `npm run db:admin -- --inspect` followed by `npm run db:admin -- --apply` with that environment’s credentials.
- Require `20261021_integrity_v1`, `20261021_workflows_v1`, `20261021_integrity_v2` and the five version columns/triggers. Runtime defaults to verification; leave `CCS_SCHEMA_MODE=bootstrap` unset.
- Existing admins sign in using their current passwords; legacy staff sessions can require sign-in again. Do not run provisioning against an already administered database.
- Confirm the deployment’s stable `CCS_MFA_KEY` if authenticator enrollment will be offered. Never rotate an existing key without a recovery plan. Owner enrollment and recovery-code storage remain user actions.
- Verify cookie Secure/HttpOnly/SameSite behavior and same-origin mutation protections behind the actual deployment proxy. Confirm infrastructure/IP rate protections and public password recovery email configuration.
- Exercise a real admin and moderator journey, student/banned/expired rejection, keyboard navigation, screen-reader naming, focus restoration, 200% zoom and rendered contrast.
- Resolve or explicitly accept the pre-existing public-app lint baseline before claiming a clean repository-wide check. The changed admin modules have their own targeted lint check.
- Obtain deployment authorization, publish a preview, then rerun authenticated checks before a production rollout.

## Deliberate retained/deferred items

- One legacy post has no corresponding author. It remains retained; the new FK prevents new orphans while leaving existing rows unvalidated. Attribution/repair requires a separate historical-data decision.
- Audit export awaits retention/redaction policy. Ticket assignment/priority is optional follow-on work. The CMS preview is a content preview; the public app continues to render the actual site.
