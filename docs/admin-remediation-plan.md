# Admin remediation plan

Prepared 21 October 2026. Source: [52-finding audit](admin-audit-2026-10-21.md). Finding numbers below refer to that audit. This document tracks the implementation sequence and verification status.

Implementation update (21 October 2026): the core Phase 1/2 access work remains intact. The configured hosted Neon database is now upgraded: 10 accounts and 2 active administrators were retained; a before/after credential-and-role fingerprint matched. Integrity and conversation migrations are recorded as `20261021_integrity_v1`, `20261021_workflows_v1` and repair `20261021_integrity_v2`. One pre-existing orphan post was retained rather than deleted/reassigned. No app push or deployment has occurred.

Core Phase 3–6 implementation has advanced substantially; detailed delivery and remaining acceptance checks are below. Release is still gated on authenticated preview/infrastructure verification, with optional MFA configuration/enrollment remaining owner-controlled.

Design decision: the user chose **Inspector**, the third proposal, on 21 October 2026. Implement the burgundy Apple Mail-inspired navigation rail, work list and detail inspector; do not return to the rejected sidebar-dashboard direction. The initial implementation now routes /admin to Inspector, with Overview analytics as the default landing workspace, list/detail selection for records, URL state, light/dark/system themes, and mobile list/detail navigation. Existing management editors remain available within the selected-record pane. Old console chrome was removed and editors extracted into AdminPanes.jsx. This advances part of Phases 4/5/6; it does not mark those phases complete or replace the remaining security/data work.

Continue from the delivery checklist below. Do not re-provision existing administrators, reset credentials, delete the legacy orphan, or mark the complete release gate passed based only on local fixtures. All Phase 1/2 security changes must remain intact.

## Public navigation correction — 21 October 2026

User-reported landing flashes and missing browser history were traced to virtual page state booting as landing and route changes replacing history entries. Public screens/post ids now derive directly from the URL. Native history navigation keeps the public shell mounted, pushes deliberate navigation, and replaces auth redirects/legacy-link normalization. Navigation chrome remains visible while lazy screen code loads. Session guards wait for server truth; auth pages no longer fetch a forum feed, and account autosave/onboarding wait for server account hydration. Slow profile/post results cannot change the page after navigation. Profile-to-self actions now navigate explicitly. The profile-save payload error in the supplied development log was also corrected using a shared editable-field contract.

Validation: production build, 20 existing admin regressions, 2 public loading/profile contract tests, and browser checks against the actual production Next router with synthetic API responses. The browser checks cover server HTML/deep links, previous-site boundaries, Back/Forward, persistent session/shell, protected redirects, late profile/login replies, and no landing-screen flash. Changed routing/state/profile/auth modules pass targeted lint. This is local app work; deployment and the remaining Phase 7 release gates above are still outstanding.

## Analytics and performance correction — 21 October 2026

Overview is again the default admin landing page. Its totals, charts, runtime/memory/storage/integration diagnostics and audit remain; Reports remains a separate workspace. Analytics has the full available width within Inspector.

Performance work moved forward from Phase 6 because the user reports slowness in both public and admin areas:

- Batch cold-start schema initialization into one transactional Neon request with an advisory lock; hosted execution remains unverified.
- Join session/current-account validation and throttle heartbeat/expired-session cleanup. Authorization remains current on each protected request.
- Aggregate overview totals without loading account records. Cache costly database diagnostics for 60 seconds per worker, keeping runtime samples fresh. Pause hidden-tab polls, prevent overlaps, abort on unmount and offer retry on initial failure.
- Cache admin queues for 15 seconds within the mounted console; clear on mutations. Refresh always bypasses this cache.
- Load public screens and admin editor sections on demand. Bundle animation libraries locally to comply with the existing CSP; remove CDN readiness polling and initial invisible hero content.
- Launch feed/account/landing requests concurrently and apply each independently. Deduplicate public landing requests with a 10-second snapshot; preserve all public statistics.

Validation: 18 staff/enrollment/database tests; public request sharing/expiry/failure recovery test; production build; targeted lint (native-image warnings remain). Browser fixtures exercise default analytics, queues/editors, theme, URL state, mobile widths, and the production public shell under delayed API responses. Fixtures use synthetic data, not hosted DB access.

Controlled esbuild startup comparison (uncompressed JavaScript, static imports only): public 515,522 → 170,413 bytes; admin 320,823 → 250,583 bytes. On-demand libraries/screens are additional downloads when used. Disposable DB query checks: staff gate 6 → 1; overview 14 → 4 on the first load and 2 on subsequent loads within the diagnostic TTL. These are local structural measurements, not production latency or actual Next.js transfer sizes.

Historical checkpoint: these initial performance measurements preceded the hosted migration. Current delivery and release status is recorded in the Phase 3–7 checkpoint below.

## Overview visual rebuild — 21 October 2026

The user requested a full aesthetic redo of Overview to match Inspector. The legacy glowing profiler strips, rainbow accents, blur panels, nested cards and duplicated title were replaced with one community summary surface, burgundy line charts, Community/Roles/Memory/Platform trend selectors, a staff journal, and compact platform diagnostic columns. Light/dark/system themes use the existing Inspector tokens. All totals, runtime/memory/storage/session metrics, integrations and recent audit data remain available; configuration details are expandable. Chart data is also available in a semantic snapshot table. No new visualization dependency, API call or database change was introduced. Existing polling, visibility, cancellation and diagnostic caching behavior is retained.

## Phase 3–7 delivery checkpoint — 21 October 2026

### Delivered

- **Phase 3:** additive FK constraints prevent new orphans without deleting legacy data; database triggers keep comment counts and references consistent; deletions retain report evidence and clean dependent content. Staff role/ban changes serialize and share atomic audit persistence. Settings, profiles, posts, announcements and tickets use revision checks; invalid object roots, unsupported/mixed mutations and excessive content fail explicitly. Staff/public post/comment writes share content and banned-term policy. Guest restrictions cover feed, individual posts, search, comments and profile reads. Unsupported email/link policies are disabled. Startup verifies the migration ledger, actual version columns and triggers instead of running request-time DDL. Bootstrap requires an explicit setting; migrations are not run automatically during hot reload.
- **Phase 4:** explicit Save/Discard/Reload workflows replace profile/status/settings blur saves and the post modal. Requests are locked against duplicate submissions; drafts survive failures and conflicts; navigation checks include click-driven CMS changes. Search requests debounce and abort; query/status/role/ban/date filters live in the URL. Queues have retry, refresh and load-more controls. Native reauthentication dialog cancellation preserves drafts. Textareas have stable accessible names, and switches expose checked/disabled states.
- **Phase 5:** reports have status/history filters, retained snapshots, resolution notes and atomic linked post removal. People support server-side name/handle/email search, role/ban filters, pagination, focused profile/role controls and audit links. Posts show author/context, Markdown/image previews, edit history and comment removal with evidence/reason. Ticket replies append with author/time and idempotency keys; legacy replies are preserved, and owners see the conversation. Announcements can be edited/repinned with revisions. CMS has typed fields, an optional validated JSON editor, content preview, versioned publication and revision restore. Audit history has search/date filtering, pagination, readable actions and record links.
- **Phase 6:** Overview keeps all analytics, its Inspector styling and bounded queries; open-report/ticket links add actionable work. Semantic status colors now adapt to light/dark themes. Polling/caching safeguards remain.

Additional public-policy integration: post/comment content is no longer restored from persistent local storage, failed logout preserves the signed-in state, and failed post edits retain the draft instead of appearing saved locally. Public landing CMS/settings/statistics now use one aggregate query; feed hydration runs independent reads together and excludes credential fields.

### Verification and release gates

- Disposable PostgreSQL regression suite covers migration repeatability, legacy orphan/reply preservation, required-audit rollback, deletion counters/evidence, account/version conflicts, policy enforcement, announcement revisions, linked report removal, ticket retry/history and CMS restore. Actual route handlers reject malformed account/post mutations using the real staff gate.
- Component browser fixtures cover default analytics, all sections, search/pagination, draft navigation protection, conflict recovery, reauth cancellation, announcement save, duplicate ticket click, CMS preview/publish/restore, settings and 320px–1440px widths. These are synthetic API fixtures, not an authenticated hosted-admin session.
- Production build and targeted lint pass for the changed admin/backend modules. Full repository lint retains pre-existing public-app findings; do not represent that baseline as a clean full-repository pass.
- The configured hosted database was migrated and credentials/roles verified. HTTP smoke checks found an early-ledger/version-column drift; the additive v2 repair restored all five columns and version triggers and is covered by a dedicated regression case. The one legacy orphan is deliberately retained; its FK is `NOT VALID` for existing rows while enforcing new writes. Decide historical attribution separately before validating that legacy constraint.
- Still required before publishing: an authenticated admin/moderator preview journey, production cookie/origin behavior, MFA-key/enrollment choice, infrastructure/IP protections, final keyboard/screen-reader/zoom/contrast checks and deployment approval. No credentials, sessions or production test accounts are manufactured to bypass that journey.
- Deferred explicitly: controlled audit export until retention/redaction policy is settled; optional ticket assignment/priority; pixel-identical full-site CMS preview (the current preview checks content and retains the public page’s existing rendering).

### Database operation

Use `npm run db:admin -- --inspect` for orphan counts and `npm run db:admin -- --apply` for the transactional, idempotent deployment migration. The command reads `.env` then `.env.local`, reports only aggregate verification and never prints credentials. Avoid `db:push` against production: the explicit migration owns retained legacy data and trigger behavior. Both development and production default to schema verification; `CCS_SCHEMA_MODE=bootstrap` is only an explicit development/bootstrap escape hatch, not the normal release path.

## How the work is ranked

- **Rank 1 — Immediate:** unauthorized access or privilege acquisition. Fix before further feature work.
- **Rank 2 — Essential:** permission enforcement, session security, data loss, broken policy promises and trustworthy mutation/audit behavior. Complete before treating the admin panel as production-ready.
- **Rank 3 — Required usability:** reliable saves, recovery, accessible navigation and forms, accurate operational information. Complete before broad staff rollout.
- **Rank 4 — Workflow rebuild:** replace incomplete administrative workflows that cause repeated manual work or lack necessary context. Deliver incrementally after the foundations.
- **Rank 5 — Polish:** visual language and cosmetic consistency. Last, except where readability or accessibility makes a change Rank 3.

Rank measures urgency; rebuild scope measures how much to replace. A severe defect can need a small patch. A large redesign can be less urgent. Existing audit P0/P1/P2 labels describe individual findings; these ranks prioritize delivery packages.

## How much each area needs redoing

**Replace the workflow:** administrator self-registration/invitations; raw-JSON-only landing publication; overwriteable ticket replies. Keep reusable rendering and validated data helpers where appropriate.

**Restructure substantially:** shared console navigation and state; users list/detail editor; report review; settings save/version behavior. Refactor progressively behind the same public URLs rather than rewrite the application at once.

**Repair and extend:** login/session behavior; post moderation; announcements; audit viewer; overview. Keep the existing server authorization checks and useful UI pieces, then fix their gaps.

**Polish after behavior:** icons, palette consistency, spacing and terminology. Focus indication, labels, contrast and keyboard operation belong to required usability, not optional polish.

## Phase 0 — Establish a safe verification baseline

Rank: prerequisite. Scope: small setup task. Run alongside the urgent Phase 1 work; do not delay closing registration while building an elaborate test system.

1. Restore missing dev dependencies from the lockfile; run lint and capture the actual baseline. Build already passed in the audit.
2. Configure a disposable database and synthetic fixtures for anonymous visitors, students, moderators, admins, banned accounts, and the last usable admin. Include related posts/comments/reports/tickets.
3. Add focused regression-test infrastructure for authentication, authorization and destructive/concurrent mutations. Keep production credentials/data out of fixtures.
4. Record current schema, migration path and recovery procedure before database changes. Preserve existing README changes and ignored coursework/static files.

**Done when:** build/lint results are known, fixtures can be recreated, and critical changes can be tested without touching production records. Browser checks still need an authenticated test session.

## Phase 1 — Close administrator account acquisition gaps

Rank: **1**. Scope: targeted emergency repair followed by replacement of onboarding. Findings: **1, 2, 3, 9, 12**.

1. Immediately remove passwordless existing-account promotion/session creation. Existing-account elevation must go through an authenticated admin and verified account ownership; never unban implicitly.
2. Close anonymous bootstrap unless an explicit owner-controlled setup mechanism authorizes it. Do not make zero admins automatically reopen public setup.
3. Make first-admin creation atomic so concurrent requests cannot both claim ownership.
4. Replace the reusable global invite with recipient-bound, expiring, single-use invitations and revocation, or keep public self-registration disabled and use authenticated promotion. Recommended initial release: authenticated promotion only; invitations can follow once implemented fully.
5. Report accurate setup/invitation availability in forms. Restrict the public bootstrap response to the minimum required state.

**Done when:** an arbitrary password never grants access to an existing account; unauthorized setup is rejected; concurrent setup creates only the intended admin; disabled onboarding is represented accurately. Tests cover both an empty database and an existing deployment.

**Delivery:** isolate the urgent closure as a small, reviewable security change. Do not couple it to the console redesign.

## Phase 2 — Make staff access and sessions coherent

Implementation update: core permissions, dedicated staff login, eight-hour staff sessions, request-idle expiry, recent-password confirmation, optional encrypted MFA/recovery codes, durable account throttling, logout recovery and database guards are implemented locally. Disposable PostgreSQL tests cover real application services. Hosted migration is now applied and verified; MFA-key configuration/enrollment, infrastructure/IP protections and authenticated preview verification remain release checks. Existing admins must not be re-provisioned. See [staff security upgrade](admin-staff-security.md).

Rank: **2**. Scope: medium refactor of authentication and capabilities. Findings: **4, 5, 6, 7, 8, 10, 11, 13, 19, 23, 37, 38**.

1. Write one permission matrix covering actor role, target role and operation. Proposed default: moderators manage students and content; administrators manage staff and deployment settings. Enforce the matrix on the server and reflect it in controls.
2. Protect the last usable administrator atomically, including ban/demotion/delete scenarios. Align self-demotion controls with the server rule.
3. Check banned status during session resolution. Prevent a concurrent login from escaping a ban; revoke affected sessions consistently.
4. Add durable login/invite throttling and bounded credential inputs; use asynchronous hashing. Verify any existing infrastructure controls before duplicating them.
5. Define staff session lifetime and idle timeout; add recent-authentication checks for promotion, deletion and sensitive publication. Add MFA with recovery and enrollment safeguards; do not lock out the current deployment owner during rollout.
6. Make admin login reject ineligible accounts with useful, non-enumerating feedback. Add password recovery, autocomplete, reveal control and announced errors.
7. Make logout confirm server success and offer retry. Explain expired/revoked sessions clearly.
8. Hide unavailable landing/settings/onboarding actions and prohibited target actions from moderators.

**Done when:** every sensitive route passes tests for all account states; changing client UI cannot bypass permissions; banned/expired sessions fail; logout failures are recoverable; staff can complete sign-in/recovery with a keyboard. Validate cookie and origin handling in a deployed preview.

## Phase 3 — Protect database consistency and enforce real policies

Rank: **2**. Scope: substantial backend work, delivered as separate migrations and behavior changes. Findings: **14, 15, 16, 17, 18, 20, 21, 22, 30, 45, 46, 48, 52**.

1. Reconcile bootstrap DDL and Drizzle schema. Define foreign keys, deletion policy, indexes and a controlled migration path. Inspect existing orphaned data with read-only queries before deciding how to repair it; do not blindly cascade-delete historical data.
2. Make user/post deletion and ban/session revocation atomic. Reconcile dependent comments, counts and report references. Decide which moderation evidence to retain as snapshots before deleting source records.
3. Introduce strict request schemas and consistent JSON error/status contracts. Reject unsupported fields, invalid roots, empty mutations and nonexistent targets; return canonical saved records.
4. Use one content-validation policy for public and staff writes. Reject excess input instead of silently truncating it.
5. Add atomic updates or version checks to settings and profiles. A stale save must produce a recoverable conflict, not overwrite another editor's work.
6. Disable nonfunctional policy switches immediately. Then enforce guest visibility and banned-word rules across relevant APIs. Email verification and link moderation stay unavailable until their complete server workflows exist; completing them is an explicit follow-on within this phase if those policies are required for release.
7. Validate landing CMS shape before accepting publication, including empty/missing arrays and nested field types.
8. Establish reliable security auditing: event coverage, attributable changes, sensitive-field redaction and visible audit-write failures. Sensitive operations must not claim success without required audit persistence.
9. Make database initialization recover after transient failure and handle failures inside the structured API error boundary.
10. Bound list endpoints with cursor pagination and filtering. Move runtime DDL into deployment migrations after verifying the migration process on a clean database and an upgraded fixture.

**Done when:** injected failures cannot leave partial deletions; related counts/references remain correct; concurrent edits preserve both changes or return a conflict; policy controls match actual public API behavior; invalid inputs fail predictably; important successful mutations have audit records; migrations work on both clean and existing databases.

**Dependency:** Phase 2 supplies the permission policy. API contracts and versioning from this phase must be settled before broad workflow/UI replacement.

## Phase 4 — Standardize the console experience

Rank: **3**. Scope: substantial shared UI refactor. Findings: **24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 40**.

1. Extract shared request/error, form, record-editor and capability components from the large console file as needed for the following changes. Avoid a purely cosmetic file split.
2. Put section, filter and selected-record state in URLs; support refresh, bookmarks and browser Back/Forward.
3. Standardize Save/Cancel for related edits. Add baseline/dirty tracking, discard protection and reconciliation with canonical server responses.
4. Add per-action pending locks, retry-safe creation where appropriate, and clear save/conflict/success feedback. Preserve drafts on failed requests.
5. Abort or sequence searches; separate initial loading, refreshing, empty, failed and loaded states. Offer Retry instead of false emptiness or endless skeletons.
6. Use accessible labels, announced errors/status, visible focus and proper switch semantics. Implement shared dialogs/drawers with Escape, initial focus, focus containment/restoration and hidden background controls.
7. Replace fixed-width layout assumptions with responsive editors and wrapping controls. Verify 320/375/768/920px, desktop, 200% zoom and keyboard-only use.

**Done when:** navigation is restorable; edits are not silently discarded; repeated clicks do not duplicate mutations; stale responses cannot replace newer results; all core actions have observable outcomes; staff can operate forms and overlays using a keyboard at the tested viewport sizes.

## Phase 5 — Rebuild incomplete operational workflows

Rank: **4**, with foundational data contracts already fixed. Scope: largest product phase; ship each workflow separately. Findings: **39, 41, 42, 43, 44, 47, 49**.

1. **Reports first:** show post/author context and retained snapshots, support linked moderation actions with reasons, atomic resolution, history and pagination. This is the primary safety queue.
2. **Users next:** paginated list with name/handle/email search, role/ban filters and a focused detail editor. Show relevant activity/history and capability-aware actions; avoid rendering every profile form in the list.
3. **Posts:** full Markdown/image preview, author identity, direct context links and necessary comment moderation. Preserve edit history/reasons for staff changes to user content.
4. **Tickets:** migrate the single reply into an append-only conversation model with staff identity/timestamps, per-ticket drafts and open/in-progress/closed states. Assignment/priority can follow once the essential conversation works. Preserve existing replies during migration.
5. **Announcements:** add edit/repin, consistent length validation, preview and publication feedback. Retain attribution and revision information.
6. **Landing CMS:** replace raw-JSON-only editing with typed fields, preview, drafts, versioned publish and rollback. Keep advanced JSON editing optional and schema-validated; retain current published content during migration.
7. **Audit viewer:** readable actor/action labels, record links, filters, pagination and refresh. Add controlled export after retention/redaction rules are settled.

**Done when:** a moderator can review a report and record its actual outcome; an admin can locate/edit a user without losing drafts; ticket replies retain history; announcement corrections do not require recreation; a bad CMS publish can be restored; audit history can explain who changed what.

**Dependency:** Phases 2–4 provide permission, validation, concurrency, audit and editor primitives. Building these workflows first would repeat those fixes screen by screen.

## Phase 6 — Make overview useful and finish visual consistency

Rank: **3 for correctness/performance; 5 for cosmetics**. Scope: repair/extension rather than full rewrite. Findings: **36, 50, 51**.

1. Delivered locally: replace full-record scans with aggregate queries; correct character-versus-byte labels. Cache costly diagnostics and reduce their polling frequency. This performance task can move earlier if measured load warrants it.
2. Pause hidden-tab polling, avoid overlapping requests and label worker-local snapshots clearly. Do not present client-only history as deployment-wide telemetry.
3. Preserve Overview as the default admin landing page, including all charts and runtime/storage diagnostics (explicit user correction). Add actionable open reports, tickets and pending work alongside these metrics.
4. Unify icons, typography, spacing, terminology and colors across login and console. Move deployment internals out of routine staff flows. Measure contrast rather than estimating it from source colors.

**Done when:** metrics are accurate and bounded in cost; diagnostic scope is clear; staff see work needing attention first; shared visual treatments are consistent and rendered contrast is verified.

## Phase 7 — Verify the complete journey and prepare release

Rank: release gate. Scope: cross-phase validation, not a substitute for testing each phase.

1. Run build/lint and the focused regression suite on the final implementation.
2. Exercise login → navigation → each allowed task → logout for admin/moderator, plus student/banned/expired/anonymous rejection paths.
3. Exercise failures: offline saves, database interruption, expired invite, double submission, conflicting staff edits, unauthorized direct API calls and partial-operation rollback.
4. Check keyboard/screen-reader naming, focus restoration, mobile widths, zoom, contrast and long/empty content.
5. Verify migrations against representative disposable data; verify data preservation and recovery. Review production configuration, rate-limit persistence, cookie/origin behavior and audit persistence in a preview environment.
6. Produce a release checklist with evidence and remaining limitations. Deploy only when separately authorized; this planning request does not publish changes.

**Done when:** each relevant acceptance condition above has evidence, no Rank 1 issue remains, Rank 2 requirements are satisfied or the affected functionality is explicitly disabled, and any remaining Rank 4/5 work is documented without misleading staff about supported behavior.

## First implementation batch

Start with **Phase 1 plus minimal Phase 0 regression setup**. The concrete first deliverable is a reviewable change that closes the registration bypass and ownerless bootstrap path, with tests demonstrating both failures are prevented. Then implement Phase 2 in permission/session and sign-in UX slices. Keep migration work, workflow redesign and cosmetics in separate reviewable changes.

All 52 audit findings have a primary phase assignment above. Order within each phase follows dependencies and user impact; these are effort scopes, not time estimates. Estimates should follow restored tooling, schema inspection and an authenticated browser baseline.
