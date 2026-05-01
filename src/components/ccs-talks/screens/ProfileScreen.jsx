"use client";

import { defaultLandingCms } from "@/lib/ccs/landingDefaults";
import { badgeAccentForLabel, badgePillColors } from "@/lib/ccs/badgeColors";
import { statusBadgeDisplayLabels } from "@/lib/ccs/statusBadges";
import { useMemo, useState } from "react";
import { useAppState } from "../state/AppState";
import { ProfileEditModal } from "../ui/ProfileEditModal";
import { AvatarBannerModal } from "../ui/AvatarBannerModal";
import { AccountCenterModal } from "../ui/AccountCenterModal";
import { PostCard } from "../components/PostCard";
import { FeedComposer } from "../ui/FeedComposer";

function withAlpha(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function ProfileScreen() {
  const {
    profile,
    profileVisitUserId,
    visitedProfileFriends,
    resetProfileVisit,
    reloadVisitedProfile,
    posts,
    users,
    likePost,
    toggleBookmark,
    sharePost,
    reportPost,
    friends,
    subs,
    toggleFollow,
    sendFriendRequest,
    removeFriend,
    visitUserProfile,
    tokens,
    prefs,
    publishPost,
    persistFullProfile,
    usernameCooldownUntil,
    badgeColors,
    isAuthed,
    setPage,
    profileNotFoundHandle,
    openPost,
  } = useAppState();
  const isLight = prefs.mode === "light";
  const [isEditing, setIsEditing] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [tab, setTab] = useState("posts"); // posts | about | friends | photos
  const [draft, setDraft] = useState("");
  const [composeTag, setComposeTag] = useState(() => prefs.defaultPostTag || "General");
  const [composeImage, setComposeImage] = useState("");
  const [postTagOptions] = useState(() => defaultLandingCms().postTagOptions);

  /** Signed-out user viewing another member via forum author click — public card only. */
  const isGuestPeek =
    !isAuthed && !!String(profileVisitUserId || "").trim();

  /** Guests never see Posts/Friends panels; stale tab state maps to About. */
  const peekTab = useMemo(() => {
    if (isGuestPeek && (tab === "posts" || tab === "friends")) return "about";
    return tab;
  }, [isGuestPeek, tab]);

  const displayUser = useMemo(() => {
    if (!profileVisitUserId) return profile;
    return users[profileVisitUserId] ?? null;
  }, [profileVisitUserId, users, profile]);

  const isSelf = !profileVisitUserId || String(profileVisitUserId) === String(profile.id);

  const theirFriendIds =
    profileVisitUserId &&
    visitedProfileFriends &&
    String(visitedProfileFriends.userId) === String(profileVisitUserId)
      ? visitedProfileFriends.friendIds || []
      : [];

  const visitInFlight = !!(profileVisitUserId && !displayUser);

  const user = displayUser;
  const profileStatusLabels = statusBadgeDisplayLabels(user);

  const myPosts = useMemo(
    () =>
      !displayUser
        ? []
        : posts
            .filter((p) => p.userId === displayUser.id)
            .slice()
            .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)),
    [posts, displayUser]
  );

  if (profileNotFoundHandle) {
    const shell = {
      position: "fixed",
      top: 0,
      left: "var(--ccs-shell-left)",
      right: 0,
      bottom: 0,
      overflowY: "auto",
      overflowX: "hidden",
      padding: "1.75rem var(--ccs-shell-pad-x) 2.5rem",
      borderLeft: `1px solid ${tokens.divider}`,
      color: tokens.text,
    };
    return (
      <div className="ccs-scroll" style={shell}>
        <div style={{ maxWidth: 480, margin: "10vh auto", textAlign: "center" }}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>🔎</div>
          <div style={{ fontWeight: 950, color: tokens.textStrong, marginTop: 16, fontSize: 22 }}>User not found</div>
          <div style={{ marginTop: 10, color: tokens.textMuted, fontSize: 15, lineHeight: 1.55 }}>
            No account matches{" "}
            <span style={{ color: tokens.textStrong, fontWeight: 800 }}>@{profileNotFoundHandle}</span>.
          </div>
          <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                resetProfileVisit();
                setPage("forum");
              }}
              style={headerBtn(undefined, tokens)}
            >
              Back to forum
            </button>
            <button
              type="button"
              onClick={() => {
                resetProfileVisit();
                setPage("search");
              }}
              style={headerBtn(undefined, tokens)}
            >
              Search users
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (visitInFlight) {
    const shell = {
      position: "fixed",
      top: 0,
      left: "var(--ccs-shell-left)",
      right: 0,
      bottom: 0,
      overflowY: "auto",
      overflowX: "hidden",
      padding: "1.75rem var(--ccs-shell-pad-x) 2.5rem",
      borderLeft: `1px solid ${tokens.divider}`,
      color: tokens.text,
    };
    return (
      <div className="ccs-scroll" style={shell}>
        <div style={{ maxWidth: 480, margin: "10vh auto", textAlign: "center" }}>
          <div style={{ fontWeight: 950, color: tokens.textStrong }}>Loading profile…</div>
          <div style={{ marginTop: 10, color: tokens.textMuted, fontSize: 14, lineHeight: 1.55 }}>
            Syncing public details for this member. If this takes too long, try again.
          </div>
          <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => reloadVisitedProfile()} style={headerBtn(undefined, tokens)}>
              Retry
            </button>
            <button
              type="button"
              onClick={() => {
                resetProfileVisit();
                if (isGuestPeek) setPage("forum");
              }}
              style={headerBtn(undefined, tokens)}
            >
              {isGuestPeek ? "Back to forum" : "Back to my profile"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const avatarColor = displayUser.avatarColor || "#9b0028";
  const avatarAccent = displayUser.avatarAccent || "#ff6080";
  const bannerColor = displayUser.bannerColor || "#3a0014";
  const bannerAccent = displayUser.bannerAccent || "#ff3a6e";

  const bannerStyle = displayUser.bannerImage
    ? { backgroundImage: `url(${displayUser.bannerImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {
        background: `
          radial-gradient(900px 420px at 70% 20%, ${withAlpha(bannerAccent, 0.30)}, transparent 62%),
          radial-gradient(700px 380px at 20% 60%, ${withAlpha(bannerAccent, 0.22)}, transparent 60%),
          linear-gradient(180deg, ${bannerColor}00 0%, ${bannerColor}D9 100%),
          ${bannerColor}
        `,
      };
  const avatarStyle = displayUser.avatarImage
    ? { backgroundImage: `url(${displayUser.avatarImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(135deg, ${avatarAccent}, ${avatarColor})` };

  return (
    <div
      className="ccs-scroll"
      style={{
        position: "fixed",
        top: 0,
        left: "var(--ccs-shell-left)",
        right: 0,
        bottom: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "1.75rem var(--ccs-shell-pad-x) 2.5rem",
        borderLeft: `1px solid ${tokens.divider}`,
        color: tokens.text,
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {!isSelf ? (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              borderRadius: 14,
              border: `1px solid ${tokens.cardBorder}`,
              background: tokens.surfaceAlt,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 13, color: tokens.textMuted }}>
              Viewing{" "}
              {isGuestPeek ? (
                <span>
                  public profile · <b style={{ color: tokens.textStrong }}>@{displayUser.handle}</b>
                </span>
              ) : (
                <span>
                  <b style={{ color: tokens.textStrong }}>@{displayUser.handle}</b>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                resetProfileVisit();
                if (isGuestPeek) setPage("forum");
              }}
              style={{
                border: `1px solid ${tokens.border}`,
                background: tokens.cardBg,
                color: tokens.text,
                padding: "8px 12px",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              {isGuestPeek ? "Back to forum" : "Back to my profile"}
            </button>
          </div>
        ) : null}
        {/* Banner: taller, no overlay text. Avatar floats and overlaps the
            info plate below — so name/badges no longer cover the banner. */}
        <div className="ccs-profile-banner" style={{ position: "relative", borderRadius: 22, overflow: "hidden", border: `1px solid ${tokens.cardBorder}`, boxShadow: isLight ? "0 14px 32px rgba(60,0,20,0.14)" : "0 22px 70px rgba(0,0,0,0.35)" }}>
          <div className="ccs-profile-banner-img" style={{ height: 320, ...bannerStyle }} />
          {/* top → bottom fade so the bottom blends into the info plate */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: isLight
                ? "linear-gradient(to bottom, rgba(255,245,247,0) 0%, rgba(255,245,247,0.45) 70%, rgba(255,245,247,0.95) 100%)"
                : "linear-gradient(to bottom, rgba(26,0,8,0) 0%, rgba(26,0,8,0.55) 70%, rgba(26,0,8,0.95) 100%)",
            }}
          />
          {!displayUser.bannerImage && (
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`, backgroundSize: "180px 180px", opacity: 0.30, maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0) 100%)" }} />
          )}
        </div>

        {/* Info plate: avatar overlaps upward, info+actions are vertically
            centered along the avatar's middle. */}
        <div
          className="ccs-profile-info-plate"
          style={{
            position: "relative",
            marginTop: -56,
            zIndex: 2,
            borderRadius: 22,
            border: `1px solid ${tokens.cardBorder}`,
            background: tokens.cardBg,
            backdropFilter: "blur(14px)",
            padding: "18px 20px 16px 152px",
            minHeight: 120,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            boxShadow: isLight ? "0 14px 32px rgba(60,0,20,0.10)" : "0 22px 70px rgba(0,0,0,0.30)",
          }}
        >
          {/* Avatar (overlapping upward) */}
          <button
            onClick={() => isSelf && setEditingAvatar(true)}
            title={isSelf ? "Edit avatar" : ""}
            disabled={!isSelf}
            className="ccs-profile-avatar"
            style={{
              position: "absolute",
              left: 18,
              top: -56,
              width: 116,
              height: 116,
              border: "none",
              padding: 0,
              background: "transparent",
              cursor: isSelf ? "pointer" : "default",
              opacity: isSelf ? 1 : 1,
            }}
          >
            <div
              style={{
                width: 116,
                height: 116,
                borderRadius: 30,
                border: `3px solid ${isLight ? "rgba(255,245,247,0.95)" : "rgba(20,0,8,0.95)"}`,
                boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
                ...avatarStyle,
              }}
            />
            {isSelf ? (
              <div
                style={{
                  position: "absolute",
                  right: -6,
                  bottom: -6,
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: isLight ? "rgba(255,255,255,0.95)" : "rgba(20,0,8,0.95)",
                  border: `1px solid ${tokens.borderStrong}`,
                  color: tokens.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                🖌
              </div>
            ) : null}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950, fontSize: 22, color: tokens.textStrong, letterSpacing: "-0.5px" }}>{user.name}</div>
              <div style={{ color: tokens.textMuted, fontSize: 13 }}>@{user.handle}</div>
            </div>
            <div style={{ marginTop: 4, color: tokens.textMuted, fontSize: 13, lineHeight: 1.5 }}>
              {user.university} · {user.college} · {user.program}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {profileStatusLabels.map((lbl) => (
                <ChipT key={`st-${lbl}`} tone="statusBadge" tokens={tokens} isLight={isLight}>
                  {lbl}
                </ChipT>
              ))}
              <ChipT tokens={tokens}>{user.year}</ChipT>
              {(user.badges || []).slice(0, 3).map((b) => (
                <ChipT key={b} tokens={tokens} tone="badge" accentHex={badgeAccentForLabel(badgeColors || {}, b)} isLight={isLight}>
                  {b}
                </ChipT>
              ))}
            </div>
          </div>

          {isSelf ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button onClick={() => setIsEditing(true)} style={headerBtn("ghost", tokens)}>
                Edit profile
              </button>
              <button onClick={() => setEditingAvatar(true)} style={headerBtn("solid", tokens)}>
                🖌 Cover
              </button>
            </div>
          ) : isGuestPeek ? (
            <GuestPeekProfileActions target={user} tokens={tokens} setPage={setPage} />
          ) : (
            <OtherProfileActions
              target={user}
              viewerId={profile.id}
              tokens={tokens}
              subs={subs}
              friends={friends}
              toggleFollow={toggleFollow}
              sendFriendRequest={sendFriendRequest}
              removeFriend={removeFriend}
            />
          )}
        </div>

        {/* Account Center plate (entry into the paginated modal) */}
        {isSelf ? (
        <button
          onClick={() => setAccountOpen(true)}
          style={{
            marginTop: 14,
            width: "100%",
            textAlign: "left",
            border: `1px solid ${tokens.cardBorder}`,
            background: tokens.cardBg,
            backdropFilter: "blur(12px)",
            borderRadius: 18,
            padding: "14px 16px",
            cursor: "pointer",
            color: tokens.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, rgba(255,96,128,0.25), rgba(155,0,40,0.55))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚙</div>
            <div>
              <div style={{ fontWeight: 900, color: tokens.textStrong }}>Account Center</div>
              <div style={{ color: tokens.textMuted, fontSize: 12 }}>Identity · Privacy · Notifications · Security · Your data</div>
            </div>
          </div>
          <div style={{ color: tokens.textMuted, fontWeight: 800 }}>Open →</div>
        </button>
        ) : null}

        {/* Tabs — guests only get About + Photos (no timeline or friends list). */}
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(isGuestPeek
            ? [
                ["about", "About"],
                ["photos", "Photos"],
              ]
            : [
                ["posts", "Posts"],
                ["about", "About"],
                ["friends", "Friends"],
                ["photos", "Photos"],
              ]
          ).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={tabPill(peekTab === k, tokens, isLight)}>
              {label}
            </button>
          ))}
        </div>

        <div className="ccs-stack-tablet" style={{ marginTop: 14, display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, alignItems: "start" }}>
          <div className="ccs-profile-aside" style={{ position: "sticky", top: 16, alignSelf: "start" }}>
            <div style={panelStyle(tokens, isLight)}>
              <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Intro</div>
              <div style={{ marginTop: 8, color: tokens.textMuted, fontSize: 13, lineHeight: 1.6 }}>{user.bio}</div>
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Chip>🌐 Campus: {user.campus}</Chip>
                <Chip>🧠 Focus: {user.focus}</Chip>
                <Chip>🧩 Org: {user.org}</Chip>
              </div>
              <div style={{ marginTop: 12, height: 1, background: tokens.divider }} />
              {isGuestPeek ? (
                <div style={{ marginTop: 12, color: tokens.textMuted, fontSize: 12, lineHeight: 1.55 }}>
                  Sign in to see this member’s posts, friends, and full activity on the forum.
                </div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Stat k="Posts" v={String(myPosts.length)} tokens={tokens} />
                  {isSelf ? <Stat k="Bookmarks" v={String(posts.filter((p) => p.bookmarked).length)} tokens={tokens} /> : null}
                  <Stat k="Likes" v={String(myPosts.reduce((s, p) => s + (p.likes || 0), 0))} tokens={tokens} />
                  <Stat k="Badges" v={String((user.badges || []).length)} tokens={tokens} />
                </div>
              )}
            </div>

            <div style={{ marginTop: 12, ...panelStyle(tokens, isLight) }}>
              <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Forum status & badges</div>
              {profileStatusLabels.length ? (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {profileStatusLabels.map((lbl) => (
                    <ChipT key={`aside-st-${lbl}`} tone="statusBadge" tokens={tokens} isLight={isLight}>
                      {lbl}
                    </ChipT>
                  ))}
                </div>
              ) : null}
              {(user.badges || []).length ? (
                <>
                  <div
                    style={{
                      marginTop: profileStatusLabels.length ? 12 : 8,
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: "0.1em",
                      color: tokens.textMuted,
                    }}
                  >
                    COMMUNITY BADGES
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(user.badges || []).map((b) => (
                      <ChipT key={b} tokens={tokens} tone="badge" accentHex={badgeAccentForLabel(badgeColors || {}, b)} isLight={isLight}>
                        {b}
                      </ChipT>
                    ))}
                  </div>
                </>
              ) : profileStatusLabels.length ? null : (
                <div style={{ marginTop: 8, fontSize: 13, color: tokens.textMuted }}>No badges yet.</div>
              )}
            </div>
          </div>

          <div>
            {peekTab === "posts" && (
              <>
                {isSelf ? (
                  <div style={panelStyle(tokens, isLight)}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Create post</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: tokens.textSubtle }}>TIMELINE</div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <FeedComposer
                        text={draft}
                        setText={setDraft}
                        selectedTag={composeTag}
                        setSelectedTag={setComposeTag}
                        postTagOptions={postTagOptions}
                        imageUrl={composeImage}
                        setImageUrl={setComposeImage}
                        users={users}
                        disabled={false}
                        onSubmit={async () => {
                          const v = draft.trim();
                          if (!v) return;
                          try {
                            await publishPost(v, composeTag || prefs.defaultPostTag || "General", composeImage);
                            setDraft("");
                            setComposeImage("");
                          } catch {
                            /* keep draft */
                          }
                        }}
                        publishLabel="Post"
                        tokens={tokens}
                        isLight={isLight}
                        minRows={2}
                      />
                    </div>
                  </div>
                ) : null}

                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  {myPosts.map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      user={users[p.userId]}
                      onLike={likePost}
                      onBookmark={toggleBookmark}
                      onShare={sharePost}
                      onReport={(id) => reportPost(id, "Reported from profile")}
                      onOpenComments={(id) => openPost(id)}
                    />
                  ))}
                  {myPosts.length === 0 && <div style={{ color: tokens.textMuted, fontSize: 13 }}>No posts yet.</div>}
                </div>
              </>
            )}

            {peekTab === "about" && (
              <div style={panelStyle(tokens, isLight)}>
                <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>About</div>
                <div style={{ marginTop: 8, color: tokens.textMuted, fontSize: 13, lineHeight: 1.7 }}>
                  {user.university} · {user.college}<br />
                  {user.program} · {user.year}<br />
                  Campus: {user.campus}
                </div>
              </div>
            )}

            {peekTab === "friends" && (
              <div style={panelStyle(tokens, isLight)}>
                {isSelf ? (
                  <>
                    <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Friends · {friends.friends.length}</div>
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                      {friends.friends.map((id) => {
                        const u = users[id];
                        if (!u) return null;
                        const av = u.avatarColor || "#9b0028";
                        const avA = u.avatarAccent || "#ff6080";
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => visitUserProfile(id)}
                            style={{
                              borderRadius: 14,
                              border: `1px solid ${tokens.cardBorder}`,
                              background: tokens.surfaceAlt,
                              padding: 10,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 6,
                              cursor: "pointer",
                              color: tokens.text,
                            }}
                          >
                            <div style={{ width: 44, height: 44, borderRadius: 999, background: u.avatarImage ? `url(${u.avatarImage}) center/cover no-repeat` : `linear-gradient(135deg, ${avA}, ${av})` }} />
                            <div style={{ fontWeight: 900, color: tokens.textStrong, fontSize: 13, textAlign: "center" }}>{u.name}</div>
                            <div style={{ color: tokens.textSubtle, fontSize: 11 }}>@{u.handle}</div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Friends · {theirFriendIds.length}</div>
                    <div style={{ marginTop: 8, color: tokens.textMuted, fontSize: 13, lineHeight: 1.5 }}>
                      People {user.name?.split(" ")[0] || "they"} is connected with on CCS Talks.
                    </div>
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                      {theirFriendIds.map((id) => {
                        const u = users[id];
                        if (!u) return null;
                        const av = u.avatarColor || "#9b0028";
                        const avA = u.avatarAccent || "#ff6080";
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => visitUserProfile(id)}
                            style={{
                              borderRadius: 14,
                              border: `1px solid ${tokens.cardBorder}`,
                              background: tokens.surfaceAlt,
                              padding: 10,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 6,
                              cursor: "pointer",
                              color: tokens.text,
                            }}
                          >
                            <div style={{ width: 44, height: 44, borderRadius: 999, background: u.avatarImage ? `url(${u.avatarImage}) center/cover no-repeat` : `linear-gradient(135deg, ${avA}, ${av})` }} />
                            <div style={{ fontWeight: 900, color: tokens.textStrong, fontSize: 13, textAlign: "center" }}>{u.name}</div>
                            <div style={{ color: tokens.textSubtle, fontSize: 11 }}>@{u.handle}</div>
                          </button>
                        );
                      })}
                    </div>
                    {theirFriendIds.length === 0 ? <div style={{ marginTop: 12, color: tokens.textMuted, fontSize: 13 }}>No friends to show yet.</div> : null}
                  </>
                )}
              </div>
            )}

            {peekTab === "photos" && (
              <div style={panelStyle(tokens, isLight)}>
                <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Cover & avatar</div>
                {isSelf ? (
                  <>
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <button onClick={() => setEditingAvatar(true)} style={{ border: `1px solid ${tokens.cardBorder}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", padding: 0, height: 120, ...bannerStyle }} title="Edit banner" />
                      <button onClick={() => setEditingAvatar(true)} style={{ border: `1px solid ${tokens.cardBorder}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", padding: 0, height: 120, ...avatarStyle }} title="Edit avatar" />
                    </div>
                    <div style={{ marginTop: 10, color: tokens.textMuted, fontSize: 12 }}>Click any tile to upload an image or pick a gradient.</div>
                  </>
                ) : (
                  <>
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ border: `1px solid ${tokens.cardBorder}`, borderRadius: 14, overflow: "hidden", height: 120, ...bannerStyle }} aria-hidden />
                      <div style={{ border: `1px solid ${tokens.cardBorder}`, borderRadius: 14, overflow: "hidden", height: 120, ...avatarStyle }} aria-hidden />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileEditModal
        open={isEditing}
        profile={profile}
        usernameCooldownUntil={usernameCooldownUntil}
        onCancel={() => setIsEditing(false)}
        onSave={async (next) => {
          await persistFullProfile(next);
          setIsEditing(false);
        }}
      />
      <AvatarBannerModal
        open={editingAvatar}
        profile={profile}
        onCancel={() => setEditingAvatar(false)}
        onSave={async (next) => {
          await persistFullProfile(next);
          setEditingAvatar(false);
        }}
      />
      <AccountCenterModal open={accountOpen} onCancel={() => setAccountOpen(false)} />
    </div>
  );
}

function GuestPeekProfileActions({ target, tokens, setPage }) {
  if (!target?.id) return null;
  const share = async () => {
    const line =
      typeof window !== "undefined"
        ? `${window.location.origin}/profile/${encodeURIComponent(String(target.handle || "").trim())}`
        : `@${target.handle || ""}`;
    try {
      await navigator.clipboard.writeText(line);
      window.alert("Profile link copied.");
    } catch {
      window.alert(line);
    }
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 420 }}>
      <button type="button" onClick={() => void share()} style={headerBtn(undefined, tokens)}>
        Share profile
      </button>
      <button type="button" onClick={() => setPage("login")} style={headerBtn("solid", tokens)}>
        Sign in to follow
      </button>
    </div>
  );
}

function OtherProfileActions({ target, viewerId, tokens, subs, friends, toggleFollow, sendFriendRequest, removeFriend }) {
  if (!target?.id || String(target.id) === String(viewerId)) return null;
  const fid = target.id;
  const following = subs?.follows?.includes(fid);
  const isFriend = friends?.friends?.includes(fid);
  const outgoing = friends?.outgoing?.includes(fid);

  const share = async () => {
    const line =
      typeof window !== "undefined"
        ? `${window.location.origin}/profile/${encodeURIComponent(String(target.handle || "").trim())}`
        : `@${target.handle || ""}`;
    try {
      await navigator.clipboard.writeText(line);
      window.alert("Profile link copied.");
    } catch {
      window.alert(line);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 420 }}>
      <button type="button" onClick={() => toggleFollow(fid)} style={headerBtn(following ? "solid" : undefined, tokens)}>
        {following ? "Following" : "Follow"}
      </button>
      {isFriend ? (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Remove @${target.handle} from your friends?`)) removeFriend(fid);
          }}
          style={headerBtn(undefined, tokens)}
        >
          Remove friend
        </button>
      ) : outgoing ? (
        <button type="button" disabled style={{ ...headerBtn(undefined, tokens), opacity: 0.58, cursor: "not-allowed" }}>
          Request sent
        </button>
      ) : (
        <button type="button" onClick={() => sendFriendRequest(fid)} style={headerBtn("solid", tokens)}>
          Add friend
        </button>
      )}
      <button type="button" onClick={() => void share()} style={headerBtn(undefined, tokens)}>
        Share profile
      </button>
    </div>
  );
}

function Chip({ children, tone }) {
  const bg = tone === "good"
    ? "linear-gradient(135deg, rgba(100,220,160,0.18), rgba(60,160,120,0.12))"
    : "rgba(80,0,26,0.40)";
  const border = tone === "good" ? "rgba(140,255,200,0.18)" : "rgba(255,255,255,0.10)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, border: `1px solid ${border}`, background: bg, color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: 700, backdropFilter: "blur(12px)", whiteSpace: "nowrap" }}>{children}</span>
  );
}

// Theme-aware variant for the new info plate
function ChipT({ children, tone, tokens, accentHex, isLight }) {
  if (tone === "statusBadge") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 999,
          whiteSpace: "nowrap",
          fontSize: 12,
          fontWeight: 850,
          border: isLight ? "1px solid rgba(20,130,170,0.30)" : "1px solid rgba(120,208,232,0.32)",
          background: isLight ? "rgba(214,239,247,0.75)" : "linear-gradient(135deg, rgba(90,210,248,0.16), rgba(40,140,210,0.10))",
          color: tokens.textStrong,
        }}
      >
        {children}
      </span>
    );
  }

  if (tone === "badge") {
    if (accentHex) {
      const p = badgePillColors(accentHex, !!isLight, {
        text: tokens.text,
        border: tokens.border,
        surfaceAlt: tokens.surfaceAlt,
      });
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            borderRadius: 999,
            border: `1px solid ${p.border}`,
            background: p.background,
            color: p.color,
            fontSize: 12,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {children}
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 999,
          border: `1px solid ${tokens.border}`,
          background: tokens.surfaceAlt,
          color: tokens.text,
          fontSize: 12,
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    );
  }

  const bg = tone === "good"
    ? "linear-gradient(135deg, rgba(100,220,160,0.20), rgba(60,160,120,0.14))"
    : tokens.surfaceAlt;
  const border = tone === "good" ? "rgba(140,200,170,0.30)" : tokens.border;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, border: `1px solid ${border}`, background: bg, color: tokens.text, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>{children}</span>
  );
}

function panelStyle(tokens, isLight) {
  return {
    borderRadius: 18,
    border: `1px solid ${tokens.cardBorder}`,
    background: tokens.cardBg,
    backdropFilter: "blur(14px)",
    padding: 16,
    boxShadow: isLight ? "0 12px 24px rgba(60,0,20,0.08)" : "0 18px 60px rgba(0,0,0,0.28)",
    color: tokens.text,
  };
}

function tabPill(active, tokens, isLight) {
  return {
    border: `1px solid ${tokens.border}`,
    background: active ? (isLight ? "rgba(60,0,20,0.10)" : "rgba(255,255,255,0.10)") : tokens.surfaceAlt,
    color: tokens.text,
    padding: "8px 12px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: "-0.1px",
  };
}

function Stat({ k, v, tokens }) {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${tokens.cardBorder}`, background: tokens.surfaceAlt, padding: "10px 10px" }}>
      <div style={{ fontSize: 12, color: tokens.textMuted }}>{k}</div>
      <div style={{ marginTop: 2, fontWeight: 950, color: tokens.textStrong }}>{v}</div>
    </div>
  );
}

function headerBtn(kind, tokens) {
  if (kind === "solid") {
    return {
      border: `1px solid ${tokens?.borderStrong || "rgba(255,255,255,0.18)"}`,
      background: "linear-gradient(135deg, #c0002a, #8b0020)",
      color: "#fff",
      padding: "10px 12px",
      borderRadius: 14,
      cursor: "pointer",
      fontWeight: 850,
      fontSize: 13,
      boxShadow: "0 10px 24px rgba(155,0,40,0.25)",
    };
  }
  return {
    border: `1px solid ${tokens?.border || "rgba(255,255,255,0.18)"}`,
    background: tokens?.surface || "rgba(20,0,8,0.45)",
    color: tokens?.text || "#fff",
    padding: "10px 12px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
    backdropFilter: "blur(12px)",
  };
}
