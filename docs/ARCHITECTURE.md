# CCS Talks — architecture (verbose)

This document maps **features and concerns to concrete files**. Paths are relative to the repository root unless noted.

For a shorter overview, see the top sections of **[README.md](../README.md)**.

---

## Environment variables (where they are read)

| Variable | Read in | Purpose |
|----------|---------|---------|
| **`DATABASE_URL`** | **`src/lib/ccs/drizzle-client.js`**, **`admin.js`** (diagnostics) | Postgres (Neon) connection string; required at runtime. |
| **`CCS_AUTH_PEPPER`** | **`src/lib/ccs/auth.js`**, **`admin.js`** (overview flags) | Global secret mixed into **scrypt** hashing (recommended in prod). |
| **`CCS_PUBLIC_URL`** / **`NEXT_PUBLIC_APP_URL`** | **`src/lib/ccs/mailer.js`**; reset URL building in **`src/lib/ccs/passwordReset.js`** via **`publicAppBaseUrl()`** | Canonical public origin for reset links & similar. **`passwordReset.js`** falls back to **`VERCEL_URL`**, then **`http://localhost:3000`** when not in production. |
| **`RESEND_API_KEY`** | **`src/lib/ccs/mailer.js`**, **`src/lib/ccs/admin.js`** (overview flags) | Sends password-reset mail via Resend; if unset, **`mailer.js`** logs/warns instead. |
| **`CCS_EMAIL_FROM`** | **`src/lib/ccs/mailer.js`** | From address when using Resend. |
| **`CCS_ADMIN_INVITE`** | **`src/lib/ccs/admin.js`** | Invite / bootstrap constraints for registering admins (**`registerAdminAccount`**, **`bootstrapStatus`**). |
| **`VERCEL_URL`** | **`src/lib/ccs/passwordReset.js`**, **`src/lib/ccs/admin.js`** | Fallback base URL on Vercel when public URL env is unset. |
| **`NODE_ENV`**, **`NEXT_PHASE`** | **`src/lib/ccs/auth.js`**, **`src/lib/ccs/cookiesHdr.js`** | Production-only pepper warning (**`NEXT_PHASE`**); **`Secure`** on session cookies when **`NODE_ENV === "production"`**. |

---

## What the product is

**CCS Talks** is a forums-style platform for the OLFU–CCS community. The UI title and description live in **`src/app/layout.js`** (`metadata`). There are two “apps” inside one Next.js codebase:

1. **Public Talks** — mostly a **client-side SPA shell** mounted from **`[[...slug]]`**; URLs like `/forum`, `/profile/alice`, `/p/postId`.
2. **Staff admin** — **server-rendered** pages under **`/admin`** with a React admin console (**`ccs-admin`**), calling **`/api/admin/*`**.

---

## Root-level configuration (what touches the whole repo)

| File | Responsibility |
|------|----------------|
| **`package.json`** | Dependencies (Next ~16, React 19, Drizzle, Neon, Tailwind 4, `react-markdown`), npm scripts (`dev`, `build`, `start`, `lint`, `db:push`, `db:studio`). |
| **`next.config.mjs`** | Security headers (**CSP**, **HSTS** in prod, **XFO**, **Referrer-Policy**, **Permissions-Policy**); `poweredByHeader: false`; dev-only CSP relaxations (`unsafe-eval` for tooling). |
| **`drizzle.config.js`** | Drizzle Kit: schema path **`src/lib/ccs/schema.js`**, migrations output **`src/lib/ccs/drizzle/migrations`**, Postgres via **`DATABASE_URL`**. |
| **`postcss.config.mjs`** | PostCSS pipeline (Tailwind 4). |
| **`eslint.config.mjs`** | ESLint (includes `eslint-config-next`). |
| **`jsconfig.json`** | **`@/*` → `./src/*`** import alias (used everywhere in imports). |
| **`AGENTS.md`** / **`CLAUDE.md`** | Notes for automation: Next.js APIs may differ from generic docs → check **`node_modules/next/dist/docs/`**. |
| **`src/proxy.js`** | Intended **middleware-style** gate: rejects cross-origin **`POST`/`PUT`/`PATCH`/`DELETE`** to **`/api/*`** unless `Origin`/`Referer` matches the host (layered CSRF). **You must wire this** per your Next.js version’s middleware/proxy conventions (there is often a small root file that re-exports `proxy`; this repo keeps the logic in `src/proxy.js`). |

---

## Next.js App Router entries (`src/app/`)

| File | Responsibility |
|------|----------------|
| **`src/app/layout.js`** | Root HTML shell: fonts (**Geist** / **Geist Mono** via `next/font/google`), **`globals.css`**, metadata (title/description). Wraps **`body`** for the whole site. |
| **`src/app/globals.css`** | Global CSS (Tailwind layers, `.ccs-low-power`, shared utility classes consumed by Talks screens). |
| **`src/app/not-found.js`** | Custom 404 when the Router resolves `not-found` (invalid Talks slug, unknown route, etc.). |
| **`src/app/[[...slug]]/page.js`** | **Single Next page** for almost all **public Talks** URLs. On each request it: awaits `params`, runs **`validateTalksSlugSegments(slug)`** from **`talksPaths.js`**, returns **`not-found`** if invalid, otherwise renders **`<CCSTalksApp />`**. |

### Admin App Router pages

| File | Responsibility |
|------|----------------|
| **`src/app/admin/layout.js`** | Layout wrapper for `/admin/*` subtree (minimal shell around admin routes). |
| **`src/app/admin/page.js`** | **`ensureReady()`** (DB + DDL); **`bootstrapStatus()`** — if bootstrap needed, redirects to **`/admin/register`**; reads session cookie → **`requireStaff(token)`**; unauthenticated → **`/admin/login`**; renders **`<AdminConsole />`** or forbidden HTML. **`dynamic = "force-dynamic"`**. |
| **`src/app/admin/login/page.js`** | Admin sign-in UI (**`AdminLoginForm`**). |
| **`src/app/admin/register/page.js`** | First admin / invite registration (**`AdminRegisterForm`**), used during bootstrap when no admins exist (or invite flow per server rules). |

### API handlers

All **`src/app/api/**/route.js`** files implement Route Handlers: **`GET`**, **`POST`**, **`PATCH`**, **`DELETE`** as exported named functions. They typically call **`ensureReady()`**, **`readSessionTokenFromCookies()`**, **`resolveViewerFromSession`** (from **`store`**), or **`requireStaff`** (from **`admin`**), then **`NextResponse.json`**. Detailed table is in [HTTP API — file-by-file](#http-api---file-by-file) below.

---

## Public Talks UI — routing

| File | Responsibility |
|------|----------------|
| **`src/components/ccs-talks/routing/talksPaths.js`** | **URL grammar** for the catch-all route: **`SEGMENT_MAP`** (first path segment → internal `page` key), **`KNOWN_FIRST_SEGMENTS`**, **`validateTalksSlugSegments`** (404 server gate), **`parseTalksPathname`** (pathname → `{ page, profileHandle, postId, … }`), **`buildTalksPathname`** (app state → canonical URL), **`normalizeTalksPathname`**. |
| **`src/components/ccs-talks/routing/TalksRouterSync.jsx`** | Keeps **`window`** URL and React **`page`** state aligned: listens to **`popstate`**, parses with **`parseTalksPathname`**, pushes history when the virtual **`page`** changes (**`history.pushState`**). |

Together, **`talksPaths.js`** decides what URLs exist; **`TalksRouterSync`** drives client navigation without full page reloads for internal view changes.

---

## Public Talks UI — shell and global behaviour

| File | Responsibility |
|------|----------------|
| **`src/components/ccs-talks/CCSTalksApp.jsx`** | Top-level **`"use client"`** SPA: wraps children in **`AppStateProvider`**; renders **NavBar**, **Sidebar**, **`TalksRouterSync`**, **`ToastHost`**, **OnboardingModal** when needed; selects **screen components** based on **`page`** from context; computes **`guestAllowed`**, **`requiresAuth`**, **`hasSidebarShell`**, **`saveGpu`** (low-power / prefs → toggles animated backgrounds via **`ThreeBackground`** / **`DynamicBlobs`**). |
| **`src/components/ccs-talks/state/AppState.jsx`** | Central React context: **`page`**, profile, **`/api/auth/me`** hydration, posts feed cache, **`profileVisitUserId`**, preferences sync (localStorage + PATCH account), onboarding, friend/bookmark/report actions driven by **`ccsApi`**. Large file coordinating most client/server boundary for Talks. |
| **`src/components/ccs-talks/state/toastBus.js`** | Simple pub/sub for toasts consumed by **`ToastHost`**. |
| **`src/components/ccs-talks/state/useLocalStorageState.js`** | Hook for persisted client state patterns (prefs-related keys where used). |

### Layout chrome (`components/` under `ccs-talks`)

| File | Responsibility |
|------|----------------|
| **`src/components/ccs-talks/components/NavBar.jsx`** | Top bar: brand, responsive nav/actions, sidebar toggle hooks. |
| **`src/components/ccs-talks/components/Sidebar.jsx`** | Left navigation drawer/sidebar for authenticated “shell” pages (Forum, bookmarks, …). |
| **`src/components/ccs-talks/components/StaticBackdrop.jsx`** | CSS/static background layer shared when heavy animation is off. |
| **`src/components/ccs-talks/components/ThreeBackground.jsx`** | Optional WebGL/Three-style hero background (disabled when **`saveGpu`** is true). |
| **`src/components/ccs-talks/components/DynamicBlobs.jsx`** | Animated blobs when effects are enabled. |
| **`src/components/ccs-talks/components/PostCard.jsx`** | Feed/post list card: excerpt, likes, badges, imagery, moderation affordances wired through props/handlers from **`ForumScreen`** / **`AppState`**. |
| **`src/components/ccs-talks/components/CcsMarkdown.jsx`** | Renders Markdown post/comment bodies with **`react-markdown`** + **`remark-gfm`**. |
| **`src/components/ccs-talks/components/MentionBody.jsx`** | Mention highlighting / `@handle` rendering layered on Markdown or plain segments. |
| **`src/components/ccs-talks/components/SignatureFooter.jsx`** | User signature strip under posts when present. |

### Screens (`screens/` — one primary “route” UI each)

| File | Responsibility |
|------|----------------|
| **`src/components/ccs-talks/screens/LandingScreen.jsx`** | Marketing/home; pulls **`GET /api/landing`** bundle (CMS + counts). |
| **`src/components/ccs-talks/screens/AboutScreen.jsx`** | Static / semi-static about content aligned with **`appConfig.js`**. |
| **`src/components/ccs-talks/screens/AuthScreen.jsx`** | Login/register tabbed UI wired to **`ccsApi.js`** (**`loginAccount`**, **`registerAccount`**). |
| **`src/components/ccs-talks/screens/ForgotPasswordScreen.jsx`** | Triggers **`requestPasswordReset`** ( **`ccsApi.js`** ). |
| **`src/components/ccs-talks/screens/ResetPasswordScreen.jsx`** | Reads **`?reset=`** token from URL/query; submits via **`resetPasswordWithToken`** ( **`ccsApi.js`** ). |
| **`src/components/ccs-talks/screens/ForumScreen.jsx`** | Main feed: tag filter, cursor pagination (**`getPosts`**), composer (**`FeedComposer`**), **`PostCard`**, moderation peek for reporters/staff cues. |
| **`src/components/ccs-talks/screens/PostDetailScreen.jsx`** | **`/p/:id`**: loads post envelope and comments thread. Uses **`ForumImageLightbox`**, **`PostDetailModal`** patterns where applicable. |
| **`src/components/ccs-talks/screens/SearchScreen.jsx`** | Search UI calling **`GET /api/search`** (**`searchForumPostsEnvelope`** in **`store.js`**). |
| **`src/components/ccs-talks/screens/ProfileScreen.jsx`** | Self vs visit profile (**`GET /api/profile`**); profile edit (**`ProfileEditModal`**, **`AvatarBannerModal`**). |
| **`src/components/ccs-talks/screens/ActivitiesScreen.jsx`** | Activity log UI from profile/account wire (**`AppState.jsx`** aggregates). |
| **`src/components/ccs-talks/screens/BookmarksScreen.jsx`** | Bookmarked posts from synced account state / refreshes. |
| **`src/components/ccs-talks/screens/FriendsScreen.jsx`** | Friends and pending invitations; **`POST /api/friends`** → **`friendPerformAction`** in **`store.js`**. |
| **`src/components/ccs-talks/screens/SubscriptionsScreen.jsx`** | Subscriptions/tags UI backed by **`subs_state`** (**`subsState`** in account wire + prefs). |
| **`src/components/ccs-talks/screens/SettingsScreen.jsx`** | Preference toggles; persists via **`PATCH /api/account`** (**`patchAccountBundles`**). |
| **`src/components/ccs-talks/screens/AnnouncementsScreen.jsx`** | Lists announcements (**`GET /api/announcements`**). |
| **`src/components/ccs-talks/screens/TicketsScreen.jsx`** | **`GET`** / **`POST`** support tickets (**`/api/tickets`**). |
| **`src/components/ccs-talks/screens/SimpleFeatureScreen.jsx`** | Reusable scaffold for simple or placeholder Talks screens. |

### Modal / UI primitives (`ui/`)

| File | Responsibility |
|------|----------------|
| **`src/components/ccs-talks/ui/ToastHost.jsx`** | Mounts toast UI subscribed to **`toastBus.js`**. |
| **`src/components/ccs-talks/ui/ConfirmDialog.jsx`** | Destructive action confirmation pattern. |
| **`src/components/ccs-talks/ui/Icon.jsx`** | Icon set / SVG helpers used across shells. |
| **`src/components/ccs-talks/ui/FeedComposer.jsx`** | New post composition (markdown, tags, attachments within **`postContentLimits.js`** / image limits). |
| **`src/components/ccs-talks/ui/ForumImageLightbox.jsx`** | Full-screen / lightbox for post images. |
| **`src/components/ccs-talks/ui/ImageCropModal.jsx`** | Client-side crop before emitting data URLs (**`imageCompressClient.js`**). |
| **`src/components/ccs-talks/ui/OnboardingModal.jsx`** | First-run onboarding; sets **`onboardingCompleted`** via account/prefs. |
| **`src/components/ccs-talks/ui/ProfileEditModal.jsx`** | Structured edits for **`profileOptions.js`** fields. |
| **`src/components/ccs-talks/ui/AvatarBannerModal.jsx`** | Avatar/banner picks with **`clampMediaField`**-compatible output. |
| **`src/components/ccs-talks/ui/AccountCenterModal.jsx`** | Account hub entry point from **`NavBar`**. |
| **`src/components/ccs-talks/ui/AccountSecurityModal.jsx`** | Password change and related security flows. |
| **`src/components/ccs-talks/ui/PostDetailModal.jsx`** | Overlay post-detail view (paired with **`PostDetailScreen`**). |
| **`src/components/ccs-talks/ui/MiniProfilePreview.jsx`** | Compact profile preview chips. |
| **`src/components/ccs-talks/ui/UserStatusBadgeRow.jsx`** | Status + badge row (**`badgeColors.js`** + **`theme.js`**). |

### Config, styling, and small hooks

| File | Responsibility |
|------|----------------|
| **`src/components/ccs-talks/config/appConfig.js`** | App copy, **`DEFAULT_PROFILE`**, placeholders mirrored in **`static-ccs-talks`**. |
| **`src/components/ccs-talks/theme.js`** | Talks **`styles`** tokens (inline JSX styles across **`ccs-talks`**). |
| **`src/components/ccs-talks/api/ccsApi.js`** | **`fetch`** wrapper (**`credentials: "include"`**, JSON bodies) mapping each public **`/api/*`** call site. |
| **`src/components/ccs-talks/cdn.js`** | Small helpers for CDN or static asset URLs (see file). |
| **`src/components/ccs-talks/useLowPower.js`** | Heuristic “save GPU” signal combined with prefs in **`CCSTalksApp.jsx`**. |
| **`src/components/ccs-talks/useScript.js`** | Injects external scripts safely when needed. |

### Client compression (`src/lib/ccs` import from client bundles)

| File | Responsibility |
|------|----------------|
| **`src/lib/ccs/imageCompressClient.js`** | Client-side resize/compress before data URLs exceed **`imageUploadLimits.js`** thresholds checked in **`store.js`**. |

---

## Admin console (`src/components/ccs-admin/`)

| File | Responsibility |
|------|----------------|
| **`src/components/ccs-admin/AdminConsole.jsx`** | Main staff UI: sections overview, landing CMS, users & roles, posts, announcements, tickets, reports, audit, site settings; **`jsonFetch`** to **`/api/admin/*`**; **`AdminLandingPane`**; **`markdownTools`** for MD fields; user/post/report actions. Previews with **`CcsMarkdown.jsx`**. |
| **`src/components/ccs-admin/adminUi.js`** | **`adminTheme`**, **`btn`**, **`panel`**, **`card`**, form **`field`/`input`** styles. |
| **`src/components/ccs-admin/AdminLandingPane.jsx`** | Landing page editor bound to **`/api/admin/landing`**. |
| **`src/components/ccs-admin/markdownTools.jsx`** | **`MarkdownToolbarRow`**, **`applyMarkdownInsert`** for admin textareas. |
| **`src/components/ccs-admin/AdminLoginForm.jsx`** | Admin login → **`POST /api/auth/login`**. |
| **`src/components/ccs-admin/AdminRegisterForm.jsx`** | Bootstrap invite → **`POST /api/admin/auth/register`**. |

---

## Server library — `src/lib/ccs/` (business logic)

These modules are imported by **`route.js`** handlers and sometimes by admin/Talks components (pure helpers only).

### Database and schema

| File | Responsibility |
|------|----------------|
| **`drizzle-client.js`** | **`DATABASE_URL`** guard; Neon **`neon()`** client; **`drizzle`** instance with **`schema`**; **`initialize()`** runs **`ddlFragments()`** in order; exports **`ensureReady()`**, **`getDb()`**. |
| **`drizzle-bootstrap.js`** | **Idempotent DDL** (`CREATE TABLE IF NOT EXISTS`, `ALTER … IF NOT EXISTS`, indexes). Keeps Neon/serverless deployments from requiring a manual migrate step before first request handling. Must stay consistent with Drizzle **`schema.js`**. |
| **`schema.js`** | **Drizzle table definitions**: `ccsUsers`, `ccsSessions`, `ccsPosts`, `ccsComments`, `ccsPresence`, `ccsAnnouncements`, `ccsTickets`, `ccsPasswordResetTokens`, `ccsReports`, `ccsFriendRequests`, `ccsAuditLog`, `ccsSiteSettings`. Source of truth for column types (`jsonb`, `bigint` timestamps). |

### Auth, cookies, passwords

| File | Responsibility |
|------|----------------|
| **`auth.js`** | **`hashPassword`** / **`verifyPassword`** (scrypt + per-user salt + optional **`CCS_AUTH_PEPPER`**), **`sanitizeEmail`**, **`newPasswordRecord`**, **`sessionCookieName`**. |
| **`cookiesHdr.js`** | Helpers to **build `Set-Cookie`** for session issuance (flags: **httpOnly**, **SameSite**, **path**, **max-age** semantics). Used by login/logout/register routes. |
| **`cookiesRead.js`** | Reads **`ccs_session`** (or **`sessionCookieName()`**) from Next **`cookies()`**. |
| **`passwordReset.js`** | **`requestPasswordResetByEmail`**, **`resetPasswordWithToken`**: tokens in **`ccsPasswordResetTokens`**, anti-enumeration, builds reset URL (**`mailer.publicAppBaseUrl`**, **`VERCEL_URL`** fallback), emails via **`sendPasswordResetEmail`** when configured. |

### Core domain (“store”) and feed shaping

| File | Responsibility |
|------|----------------|
| **`store.js`** | **Primary application service layer** for Talks APIs: **`fetchPublicFeed`**, **`createUserPost`**, **`togglePostLikeDb`**, **`toggleBookmarkDb`**, comments CRUD (**`*CommentEnvelope`**), **`searchForumPostsEnvelope`**, **`friendPerformAction`**, **`patchAccountBundles`** / **`patchUserProfile`**, **`getAccountWire`**, **`registerAccountRow`** / **`loginAccountRow`** / **`insertSession`** / **`revokeSessionToken`**, **`purgeExpiredSessions`**, **`createUserReport`**, **`presenceTouch`** / **`presenceReadmany`**, tickets (**`listTicketsForUser`**, **`createTicketForUser`**), **`fetchVisitProfileBundle`/`ByHandle`**, handle uniqueness (**`uniqueHandle`**, **`isHandleTakenElsewhere`**), **`clampMediaField`**, **`clampPostCommentImageUrl`**, Hydration **`hydrateClientPosts`** + **`buildFeed`**. Imports **`schema`**, **`feed`**, **`accountDefaults`**, **`profileOptions`**, limits. Very large — start here when changing forum behaviour. |
| **`feed.js`** | **`buildFeed`** and **`authorProfilesByIds`**: merges users + posts + viewer-specific flags into the wire format the SPA expects (`liked`, author cards, pinned ordering helpers, etc.). |
| **`accountDefaults.js`** | **`CCS_DEFAULT_PREFS`**, **`CCS_DEFAULT_FRIENDS`**, **`CCS_DEFAULT_SUBS`**, **`normalizePrefs`/`Friends`/`Subs`/`Activities`** — shared between client initial state and DB defaults on insert. |
| **`publicUser.js`** | **`toPublicProfile`**: whitelist of profile fields safe to expose in JSON (strips secrets, normalizes **`publicRoleBadge`** via **`statusBadges`**). |
| **`profileOptions.js`** | OLFU programme/campus lists, **`mergeProfileFieldOptions`**, **`sanitizeProfileSelectFields`**, username change cooldown constant, university label — used when rendering options and validating PATCH bodies. |
| **`postContentLimits.js`** | **`CCS_POST_BODY_MAX_CHARS`**, **`CCS_COMMENT_BODY_MAX_CHARS`** (and related) — imported by API routes and **`store`**. |
| **`imageUploadLimits.js`** | Max length for data-URL / profile media fields — paired with **`clampMediaField`**. |
| **`format.js`** | Human-readable date/stat formatting shared server-side (and any isomorphic imports if used on client). |
| **`statusBadges.js`** | **`sanitizePublicRoleBadge`** and related rules for display-only role strings. |
| **`badgeColors.js`** | Badge registry colour resolution, **`BADGE_REGISTRY_MAX`**, merging admin-defined registry into maps used by UI and **`admin.js`**. |
| **`landingDefaults.js`** | Default landing CMS document shape and **`mergeLandingCms`** helpers for **`getLandingCmsMerged`** / public bundle. |

### Staff / moderation (`admin.js` + audit)

| File | Responsibility |
|------|----------------|
| **`admin.js`** | Role constants (**`ROLE_*`**), **`requireStaff`** (401/403/banned gates), **`bootstrapStatus`** / **`countAdmins`** / **`registerAdminAccount`**, **`appendAudit`**, user admin (**`listUsers`**, **`getUserDetailById`**, **`setUserRole`**, **`setUserBadges`**, **`setUserStatus`**, **`setUserBanned`**, **`deleteUserCascade`**, **`patchUserProfileAsStaff`**), posts admin (**`listAllPosts`**, **`adminPinPost`**, **`adminEditPost`**, **`adminDeletePost`**), reports (**`staffListOpenReports`**, **`staffResolveForumReport`**), announcements/tickets (**`createAnnouncementAdmin`**, **`deleteAnnouncementAdmin`**, **`listTicketsAdmin`**, **`updateTicketStaff`**), site settings (**`getSiteSettings`**, **`setSiteSettings`**, **`DEFAULT_SITE_SETTINGS`**, **`getMergedProfileFieldOptions`**), CMS (**`saveLandingCms`**, **`getLandingCmsMerged`**, **`getPublicLandingBundle`**, **`listAnnouncementsPublic`**), dashboard **`getOverview`**, **`listAudit`**. Imports **`store`** helpers for overlaps (handles, inserts). |

### Outbound mail

| File | Responsibility |
|------|----------------|
| **`mailer.js`** | **`publicAppBaseUrl()`** (**`CCS_PUBLIC_URL`** / **`NEXT_PUBLIC_APP_URL`**), **`sendPasswordResetEmail`** (Resend API when **`RESEND_API_KEY`**; otherwise warns and logs reset URL — dev-only hygiene). |

---

## HTTP API — file-by-file

Each row is **`src/app/api/<path>/route.js`**. Implementations delegate to **`store`**, **`admin`**, **`passwordReset`**, or small inline logic.

### Public auth & identity

| File | Methods | Handles |
|------|---------|---------|
| **`auth/register/route.js`** | `POST` | New user: **`registerAccountRow`**, cookie set via **`cookiesHdr`**. |
| **`auth/login/route.js`** | `POST` | **`loginAccountRow`**, session cookie. |
| **`auth/logout/route.js`** | `POST` | **`revokeSessionToken`**, clear cookie. |
| **`auth/me/route.js`** | `GET` | **`resolveViewerFromSession`** + **`getAccountWire`**-style hydration (viewer bundle). |
| **`auth/handle-check/route.js`** | `GET` | Handle availability for registration (**`isHandleTaken`** / related). |
| **`auth/forgot-password/route.js`** | `POST` | **`requestPasswordResetByEmail`** (generic 200 semantics). |
| **`auth/reset-password/route.js`** | `POST` | **`resetPasswordWithToken`**. |

### Posts, comments, feed, moderation (public)

| File | Methods | Handles |
|------|---------|---------|
| **`posts/route.js`** | `GET`, `POST` | **`fetchPublicFeed`**, **`createUserPost`** (composer). |
| **`posts/[postId]/route.js`** | `GET`, `PATCH` | **`fetchSinglePostEnvelope`**, **`updatePostBody`** (owner edit). |
| **`posts/[postId]/comments/route.js`** | `GET`, `POST` | **`listCommentsEnvelope`**, **`addCommentEnvelope`**. |
| **`posts/[postId]/comments/[commentId]/route.js`** | `PATCH`, `DELETE` | **`updateCommentEnvelope`**, **`deleteCommentEnvelope`**. |
| **`posts/[postId]/like/route.js`** | `POST` | **`togglePostLikeDb`**. |
| **`posts/[postId]/bookmark/route.js`** | `POST` | **`toggleBookmarkDb`**. |
| **`posts/[postId]/report/route.js`** | `POST` | **`createUserReport`**. |

### Profile, account, discovery

| File | Methods | Handles |
|------|---------|---------|
| **`profile/route.js`** | `GET`, `PATCH` | Visit/self **`fetchVisitProfileBundle`**, **`fetchVisitProfileBundleByHandle`**, **`patchUserProfile`** (self). |
| **`account/route.js`** | `PATCH` | **`patchAccountBundles`** (prefs + aggregate account fields wired in handler). |
| **`profile-field-options/route.js`** | `GET` | Merged options from **`getMergedProfileFieldOptions`** path (often via **`store`** reading site settings). |
| **`search/route.js`** | `GET` | **`searchForumPostsEnvelope`**. |
| **`presence/route.js`** | `POST`, `GET` | **`presenceTouch`**; batch read **`presenceReadmany`** (friends list parameters). |

### Content & CMS (guest-readable)

| File | Methods | Handles |
|------|---------|---------|
| **`landing/route.js`** | `GET` | Public landing payload (**`getPublicLandingBundle`** / **`store`** facade as implemented). |
| **`announcements/route.js`** | `GET` | Lists announcements (**`listAnnouncementsPublic`**). |
| **`tickets/route.js`** | `GET`, `POST` | **`listTicketsForUser`**, **`createTicketForUser`**. |

### Social graph

| File | Methods | Handles |
|------|---------|---------|
| **`friends/route.js`** | `POST` | **`friendPerformAction`** (invite/accept/remove semantics encoded in POST body — see **`store`**). |

Friends **lists** are carried inside the account/profile wire from **`auth/me`** and profile visits, not a separate **`GET /api/friends`** in this codebase.

---

## Admin HTTP API — file-by-file

All under **`src/app/api/admin/`**. Handlers **`requireStaff(token)`** (and sometimes **`adminOnly`**) plus **`ensureReady()`**.

| File | Methods | Handles |
|------|---------|---------|
| **`bootstrap/route.js`** | `GET` | **`bootstrapStatus()`** snapshot for SPA/admin pages. |
| **`overview/route.js`** | `GET` | **`getOverview`** dashboard KPIs. |
| **`audit/route.js`** | `GET` | **`listAudit`**. |
| **`site/route.js`** | `GET`, `PATCH` | **`getSiteSettings`**, **`setSiteSettings`** (registration flags, **`profileFieldOptions`**, **`bannedWords`**, badge registry patches, etc.). |
| **`landing/route.js`** | `GET`, `PATCH` | **`getLandingCmsMerged`**, **`saveLandingCms`**. |
| **`users/route.js`** | `GET` | **`listUsers`** (filters). |
| **`users/[userId]/route.js`** | `GET`, `PATCH`, `DELETE` | **`getUserDetailById`**, staff profile/role/status/banned PATCH combos, **`deleteUserCascade`**. |
| **`posts/route.js`** | `GET` | **`listAllPosts`**. |
| **`posts/[postId]/route.js`** | `PATCH`, `DELETE` | **`PATCH`**: optional **`pinned`** boolean (**`adminPinPost`**) and/or **`content`** (**`adminEditPost`**). **`DELETE`**: **`adminDeletePost`**. |
| **`announcements/route.js`** | `GET`, `POST` | List/create (**`createAnnouncementAdmin`**, listing admin-side). |
| **`announcements/[announcementId]/route.js`** | `DELETE` | **`deleteAnnouncementAdmin`**. |
| **`tickets/route.js`** | `GET` | **`listTicketsAdmin`**. |
| **`tickets/[ticketId]/route.js`** | `PATCH` | **`updateTicketStaff`**. |
| **`reports/route.js`** | `GET` | **`staffListOpenReports`**. |
| **`reports/[reportId]/route.js`** | `PATCH` | **`staffResolveForumReport`**. |
| **`auth/register/route.js`** | `POST` | **`registerAdminAccount`** (invite/bootstrap path). |

---

## Static prototype (`static-ccs-talks/`)

| Path | Responsibility |
|------|----------------|
| **`static-ccs-talks/app.js`** | Vanilla router + minimal in-memory/mock flows mirroring Talks UX. |
| **`static-ccs-talks/README.md`** | How to **`python -m http.server`** or **`npx serve`**, parity notes vs Next app. |

Config drift: **`appConfig.js`** and **`theme.js`** in **`src/components/ccs-talks`** are documented as canonical sources where duplicated.

---

## Mental model cheat sheet

- **URLs** (`talksPaths` + **`[[...slug]]`**) decide what renders on the server for HTML shell; **`CCSTalksApp`** + **`AppState`** own almost all behavioural state.
- **`ccsApi.js`** mirrors **`src/app/api/**`**; when you add a route, add a typed wrapper there unless you deliberately want an isolated **`fetch`**.
- **`store.js`** is the **thick** domain layer for students’ forum operations; **`admin.js`** is the thick layer for moderation/CMS/settings.
- **Schema migrations** conceptually span **`schema.js`**, **`drizzle-bootstrap.js`**, and (if you commit them) Drizzle Kit output under **`src/lib/ccs/drizzle/migrations`** — avoid changing one without aligning the others.

---

## Maintainer note on Next.js

Framework behaviour (middleware naming, **`params`** as **`Promise`**, etc.) evolves in this lineage. Prefer **`node_modules/next/dist/docs/`** and this repo’s **`AGENTS.md`** over older Next.js tutorials when debugging routing or **`route.js`** handler signatures.
