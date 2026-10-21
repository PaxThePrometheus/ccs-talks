# Community expansion roadmap

Prepared 21 October 2026. Status: proposed implementation plan; messaging, community forums, groups and hashtags have not been implemented or migrated. Faculty-title display is a separate completed bug fix on this branch. This roadmap extends the admin work; it does not close the remaining authenticated deployment/accessibility checks in `admin-release-checklist.md`.

## Product direction

Give CCS Talks two primary workspaces: **Community** for public discussions and **Messages** for private conversations. Preserve the burgundy visual system and the current browser-history behavior. On desktop, Messages uses a conversation list, focused conversation and optional details panel. Mobile uses separate list/detail routes, with a working Back action. New features load on demand.

- **Niche forums:** durable communities with a name, description, rules, members, moderators and their own discussion feed. Start with Dev Guild, Hack Club, Capstone Circle and Study Lounge as candidate names from the landing page. Confirm real owners before publishing them. Landing-page sample membership numbers are promotional content, not membership records to import.
- **Hashtags:** clickable topics such as `#capstone`, `#dsa` and `#internships` that can span public communities. A forum is a place; a hashtag is a subject. Existing single-select categories (`General`, `Academics`, `Tech`, `Events`) remain intact during rollout.
- **Direct messages:** one private conversation per pair of accounts, with durable history, drafts, unread state, mute, block and report.
- **Group chats:** named, invitation-based conversations built on the same message storage and delivery system. A forum chat can later be linked explicitly to a community; joining a forum does not silently join a chat.

## Existing foundations and gaps

The code already has public posts/comments, friend relationships, online presence, account preferences and role-aware staff tools. `prefs.allowDMs` already exposes Everyone/Friends/None, with Friends as the default, but there is no direct-message service enforcing it yet. `schema.js` has no general conversations, community-membership or hashtag tables. Ticket messages are support records and stay separate from social conversations.

Landing community cards are CMS content. Their current links lead to the main forum rather than real dedicated communities. The current `post.tag` column is one category, not a hashtag relation. `CcsMarkdown.jsx` has mention preprocessing; hashtags need a structured Markdown text-node transform so code, URLs, existing links and image alt text are not rewritten accidentally.

## Recommended delivery order

### Phase C0 — Shared contracts and access rules

Priority: essential foundation. Depends on the current admin release checks, with design/schema work able to proceed beforehand.

1. Define membership capabilities independently from site roles: community owner/moderator/member and conversation owner/member. Site admin authority must not grant an unrestricted private-message inbox.
2. Define `canReadCommunity`, `canPostCommunity`, `canStartDM`, `canSendMessage`, `canReadConversation` and `canInviteMember` in shared server services. Apply them to reads, writes, search, counters, notification delivery and realtime subscription authorization.
3. Enforce the existing Everyone/Friends/None preference on starting a DM and on each subsequent send. Use current mutual friendship, bans and blocks, not cached client state. A block stops new direct sends/invites in both directions; previous conversation history stays available to its participants. Blocking does not pretend to remove people from shared communities/groups.
4. Establish idempotency keys, cursor contracts, durable per-user limits and transaction/outbox primitives. Store notifications and content changes atomically; delivery retries cannot create a second message.
5. Prototype realtime delivery in an isolated preview, including reconnects, cross-instance fan-out and actual project capability/cost. Select the transport only after this evidence; no new paid service is required by this plan.

Exit gate: disposable-DB permission tests deny unauthorized direct reads/subscriptions and prove duplicate sends are safe. Document the chosen transport, retention rules and group-history policy before the private-messaging pilot.

### Phase C1 — Dedicated niche forums

Priority: first visible feature. Depends on C0 community access contracts; does not require realtime messaging.

1. Add a directory at `/forums` and canonical community pages at `/f/{slug}`. Keep `/forum` as the existing aggregate feed and `/p/{id}` as the permanent post link.
2. Add community identity, rules, membership and moderator tools. First release: public read access still respects the site guest-read setting; active membership is required to post. Archived communities remain readable and stop accepting posts. Private communities are a later capability, not an unused visibility switch.
3. Add optional community assignment to posts. Existing posts remain in General; do not guess an org based on text or category. Allow audited staff moves with a reason while retaining post ids, comments and bookmarks.
4. Add join/leave, joined-community sidebar links, community-specific search/feed filters and a community choice in the composer. Local moderators can pin/lock/remove within their assigned community; site-wide bans and role changes remain site-staff capabilities.
5. Let staff connect a landing CMS community card to a real community id. Resolve its route and membership count from actual data; retain a descriptive unlinked card until an owner/community is ready.

Exit gate: joining, posting, leaving, local moderation and archived-community behavior work through real routes. Existing posts, feed links and category subscriptions survive the migration.

### Phase C2 — Hashtags and discovery

Priority: high-value discovery. Depends on C1 feed/search contracts and C0 read rules.

1. Add normalized hashtag identities, post-to-hashtag relations and topic subscriptions. Propose at most five distinct hashtags per post, 2–40 letters/numbers/underscores, Unicode-normalized and case-insensitive. Preserve a display label. Final parser fixtures must cover boundary and international-text cases before locking this rule.
2. Parse Markdown text nodes outside code/links; the server derives hashtag relations from saved content. An edit atomically removes old relations and inserts new ones. Staff removal/hide/deletion updates discovery results and counts.
3. Add `/tags/{slug}`, composer suggestions, clickable tags and follow/unfollow. Keep hashtag follows separate from existing category subscriptions; no silent reinterpretation of stored preferences.
4. Scope search, counts and trending to visible public posts. Private chats never feed public tag discovery. Defer trends until enough real activity exists; do not synthesize popularity.

Exit gate: formatting/code/mentions remain correct, edited tags update immediately, pagination is stable and hidden content cannot be inferred from tag results or counts.

### Phase C3 — Direct messaging

Priority: core communication. Depends on C0 and the selected delivery adapter; can be implemented independently of C2 after C0.

1. Build a lazy-loaded Messages workspace at `/messages` and `/messages/{conversationId}`. Add a profile Message action only when the server says the interaction is allowed; a crafted request still faces the same server checks.
2. Deliver plain-text messages with a proposed 4,000-character limit, timestamps, pending/sent/failed states, explicit retry, per-conversation drafts, cursor history, unread counts and mark-as-read. Enter sends; Shift+Enter inserts a newline, with composition/IME handling and an accessible Send button.
3. Use one durable conversation per canonical user pair. Unique `(conversation_id, sender_id, client_request_id)` prevents duplicate messages. Assign ordered per-conversation sequence numbers transactionally and advance read cursors monotonically, so reconnects and multiple tabs agree.
4. Add mute/archive, block/unblock and participant message reporting with narrowly scoped evidence snapshots. Site staff review reported evidence through the existing audited moderation model; they do not browse all private conversations by default.
5. Keep the message history usable during a delivery outage. Commit messages first, emit outbox notifications after commit, and reconcile through a cursor API after reconnect. Display a failure state if persistence fails; do not treat a local bubble as saved.

Exit gate: two real preview accounts exchange messages across tabs/devices; friendship/preference/block changes apply to subsequent sends; retries, reconnects, bans and sign-out work without missing or duplicate messages. Do not claim end-to-end encryption; retention and permitted evidence access must be stated accurately before launch.

### Phase C4 — Group chats

Priority: extend the tested message system. Depends on C3.

1. Add group creation, names, invitations, accept/decline, roles, member list, leave/remove and owner transfer. Proposed initial maximum: 50 members. Invitations require explicit acceptance and follow blocking/invite policies.
2. Reuse messages, drafts, unread cursors, delivery and reports. Store membership changes as system events. Enforce a last-owner guard transactionally.
3. Default new members to history from their accepted join sequence. A removed member immediately loses API and realtime access; rejoining starts a new membership interval rather than inheriting full history accidentally. Persist intervals so this rule is enforceable after reconnect.
4. Add per-group notification preferences and an optional community-linked chat. Community and chat roles remain separate. Blocked users may coexist in a shared group; show this clearly and keep direct-contact restrictions enforced.

Exit gate: removal/leave revokes access across active sockets and cached views, invitations cannot bypass limits or blocks, owner changes survive concurrent operations, and new members see only permitted history.

### Phase C5 — Delivery quality and staged rollout

Priority: release gate; apply relevant checks to each earlier phase too.

1. Add typing indicators and expiring presence only after durable delivery works. Keep this transient state out of the durable message table; honor online-status preferences. Read receipts beyond unread tracking are optional and need an explicit privacy preference.
2. Add notifications with per-user preferences and deduplication. Browser push/email, attachments, voice/video and large public chatrooms are later work; avoid building them into the initial send path.
3. Test long threads/groups, keyboard/screen readers, mobile split/list navigation, browser Back, slow connections, offline retry, reconnect during deploy, access revocation and unrelated public-feed performance.
4. Pilot with a small real community, measure message acknowledgement/reconnect latency and request volume, then expand behind server feature flags. Rollback disables new feature writes without deleting messages or memberships. Require actual deployed evidence before broad release.

## Proposed database and service boundaries

These are design targets, not applied DDL. Use new immutable versioned migrations, with preview validation and resumable backfills, rather than request-time schema changes.

- `ccs_communities`: stable id, unique normalized slug, name, description, rules, lifecycle state and version. `ccs_community_members`: unique community/user pair, scoped role and state. `ccs_posts.community_id`: optional FK; existing rows remain General. Protect the last active community owner on update/removal/account deletion.
- `ccs_hashtags`: unique canonical tag and display name. `ccs_post_hashtags`: unique post/tag pair. `ccs_topic_subscriptions`: unique user/tag pair. Index by tag and keyset post order; retain existing category fields/preferences during migration.
- `ccs_conversations`: kind (`direct`/`group`), direct-pair key, title and sequence counter. `ccs_conversation_members`: role, state, muted/archived flags and last-read sequence. `ccs_conversation_membership_intervals`: access windows. `ccs_conversation_invites`: expiring, revocable acceptance tokens stored as hashes.
- `ccs_messages`: conversation, ordered sequence, sender, body, client request id, created/edited/deleted state. `ccs_user_blocks`: unique directional pair. `ccs_message_reports`: participant evidence and reviewed outcome. Keep content edits/evidence retention explicit rather than deleting audit context accidentally.
- `ccs_outbox`: committed event id, scoped audience, retry state and created time. A dispatcher publishes only committed events; clients deduplicate and reauthorize on fetch. Private previews never enter public caches, browser persistent storage or cross-user CDN responses.

HTTP boundaries: community directory/detail/membership and scoped post lists; hashtag lookup/detail/follow; conversation list/create/detail; paginated messages; monotonic read cursor; invitations/members; blocks; private reports. Every list uses bounded cursor pagination. Realtime events identify a conversation/message/sequence; database reads remain the canonical source after authorization. Server-created channel names and short-lived authorized subscriptions prevent arbitrary conversation-id access.

## Delivery technology decision

Keep Neon as the system of record and initially reuse transactional HTTP SQL for durable writes where appropriate. The Neon driver's WebSocket transport is a database connection mode, not by itself a browser chat broadcast service. [Neon driver documentation](https://neon.com/docs/serverless/serverless-driver).

Vercel now documents native WebSocket serving with Fluid compute, connection duration limits and reconnect requirements. Separate instances/deployments need shared coordination, so an in-memory room map alone cannot deliver this app reliably. C0 should test native Vercel WebSockets plus a shared fan-out adapter against a managed realtime alternative, using the actual project's configuration, latency and budget. This plan leaves the vendor open. [Vercel WebSocket documentation](https://vercel.com/docs/functions/websockets).

## First implementation batch after this plan

Start C0 permission/idempotency contracts and C1 public community directory/schema. Pilot one owner-confirmed community, preserve the General feed, and wire its landing card to the real route. Follow with hashtags, then ship the shared messaging engine as direct chats before enabling groups. Text-only chat, public forums, invitation-only groups, Friends-only new DMs and history-from-join are the recommended initial defaults, subject to the explicit decisions above.
