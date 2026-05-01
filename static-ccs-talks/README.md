# CCS Talks (Static HTML/CSS/JS)

This directory is a **pure HTML + CSS + JavaScript** mirror of the main project.

It currently includes a small vanilla-JS SPA that ports **all screens** but with **~90% of the functionality removed** (minimal UI + a few core interactions per screen).

- Landing (`#/landing`)
- About (`#/about`)
- Auth (`#/login`, `#/register`)
- Forum (`#/forum`) with guest preview + basic posting/like/bookmark
- Search (`#/search`) minimal filtering over posts
- Profile (`#/profile`) basic editable profile + role override (for admin demo)
- Activities (`#/activities`) simple activity log
- Bookmarks (`#/bookmarks`) list of bookmarked posts
- Friends (`#/friends`) static lists
- Subscriptions (`#/subs`) static lists
- Settings (`#/settings`) larger text + reduce motion toggles
- Admin (`#/admin`) role-gated minimal counts

## Run it locally

Any static file server works. Examples:

### Python

```bash
cd static-ccs-talks
python -m http.server 5173
```

Then open `http://localhost:5173/`.

### Node (optional)

```bash
cd static-ccs-talks
npx serve .
```

## Notes / differences vs the full app

- Not all screens are ported yet. The sidebar shell pages like `#/profile`, `#/settings`, etc. currently show placeholders (but routing + auth-gating are wired up).
- The content and tokens are copied from:
  - `src/components/ccs-talks/config/appConfig.js`
  - `src/components/ccs-talks/theme.js`
