"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as api from "../api/ccsApi";
import {
  CCS_DEFAULT_FRIENDS,
  CCS_DEFAULT_PREFS,
  CCS_DEFAULT_SUBS,
  normalizeActivities,
  normalizeFriends,
  normalizePrefs,
  normalizeSubs,
} from "@/lib/ccs/accountDefaults";
import { DEFAULT_PROFILE } from "../config/appConfig";
import { useLocalStorageState } from "./useLocalStorageState";
import { getThemeTokens } from "../theme";

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [profile, setProfile] = useLocalStorageState("ccs.profile.v1", DEFAULT_PROFILE);
  const [feedUsersById, setFeedUsersById] = useState({});
  const [page, setPage] = useState("landing");
  const [posts, setPosts] = useLocalStorageState("ccs.posts.v1", []);
  const [commentsByPostId, setCommentsByPostId] = useLocalStorageState("ccs.comments.v1", {});
  const [activities, setActivities] = useLocalStorageState("ccs.activities.v1", []);
  const [friends, setFriends] = useLocalStorageState("ccs.friends.v1", CCS_DEFAULT_FRIENDS);
  const [subs, setSubs] = useLocalStorageState("ccs.subs.v1", CCS_DEFAULT_SUBS);
  const [prefs, setPrefs] = useLocalStorageState("ccs.prefs.v1", CCS_DEFAULT_PREFS);
  const [isAuthed, setIsAuthed] = useLocalStorageState("ccs.authed.v1", false);
  const [reports, setReports] = useLocalStorageState("ccs.reports.v1", []);
  const [bannedUserIds, setBannedUserIds] = useLocalStorageState("ccs.banned.v1", []);
  /** Server-truth role for the current viewer; defaults to "student" until /api/auth/me responds. */
  const [role, setRole] = useState("student");
  const [accountEmail, setAccountEmail] = useState("");
  /** When set, Profile screen shows this user's public card (read-only) until cleared. */
  const [profileVisitUserId, setProfileVisitUserId] = useState(null);
  /** Friend id order for the profile being visited (from server); cleared with visit reset. */
  const [visitedProfileFriends, setVisitedProfileFriends] = useState(null);
  /** Milliseconds epoch when username edit is allowed again (server: `usernameCooldownUntil`). */
  const [usernameCooldownUntil, setUsernameCooldownUntil] = useState(null);
  /** Badge label → hex map from `/api/landing` (Forum poll keeps it fresh). */
  const [badgeColors, setBadgeColors] = useState({});
  /** Deep-link post screen (`/p/{id}`). */
  const [activePostId, setActivePostId] = useState(null);
  /** When set, post detail shows “not found” for this id (URL stays `/p/…`). */
  const [postNotFoundId, setPostNotFoundId] = useState(null);
  /** When set, profile screen shows “user not found” for this handle. */
  const [profileNotFoundHandle, setProfileNotFoundHandle] = useState(null);

  const applyLandingExtras = useCallback((d) => {
    if (d?.badgeColors && typeof d.badgeColors === "object") setBadgeColors(d.badgeColors);
  }, []);

  /** Skip first debounced PATCH after we just applied server snapshot (prevents PATCH loop). */
  const lastSyncedExtrasRef = useRef("");

  const hydrateAccountFromServer = useCallback(
    (me) => {
      if (!me?.profile) return;
      setIsAuthed(true);
      setProfile((p) => ({ ...DEFAULT_PROFILE, ...p, ...me.profile }));
      setPrefs(normalizePrefs(me.prefs));
      setFriends(normalizeFriends(me.friends));
      setSubs(normalizeSubs(me.subs));
      setActivities(normalizeActivities(me.activities));
      setRole(me.role || "student");
      setUsernameCooldownUntil(typeof me.usernameCooldownUntil === "number" ? me.usernameCooldownUntil : null);
      setAccountEmail(typeof me.email === "string" ? me.email : "");
      lastSyncedExtrasRef.current = JSON.stringify({
        prefs: normalizePrefs(me.prefs),
        friends: normalizeFriends(me.friends),
        subs: normalizeSubs(me.subs),
        activities: normalizeActivities(me.activities),
      });
    },
    [setProfile, setIsAuthed, setPrefs, setFriends, setSubs, setActivities, setAccountEmail, setUsernameCooldownUntil]
  );

  const persistFullProfile = useCallback(
    async (patch) => {
      let merged = null;
      setProfile((p) => {
        merged = { ...DEFAULT_PROFILE, ...p, ...(patch && typeof patch === "object" ? patch : {}) };
        return merged;
      });
      if (!isAuthed || !merged) return;
      try {
        const out = await api.patchProfile(merged);
        if (out?.profile) {
          setProfile((p) => ({ ...DEFAULT_PROFILE, ...p, ...out.profile }));
          setFeedUsersById((prev) => ({
            ...prev,
            [out.profile.id]: { ...DEFAULT_PROFILE, ...prev[out.profile.id], ...out.profile },
          }));
        }
        if (typeof out?.usernameCooldownUntil === "number" || out?.usernameCooldownUntil === null) {
          setUsernameCooldownUntil(out.usernameCooldownUntil);
        }
      } catch (e) {
        if (e?.status === 429) {
          const na = e?.data?.nextAllowedAt;
          const hint = typeof na === "number" ? ` Try again after ${new Date(na).toLocaleString()}.` : "";
          window.alert(String(e.message || "Username changes are temporarily limited.") + hint);
          if (typeof na === "number") setUsernameCooldownUntil(na);
        } else if (e?.status === 409) window.alert("That username is already taken.");
        else if (e?.status === 413) window.alert(e.message || "Image too large to save.");
        else console.warn("[ccs] persistFullProfile", e);
      }
    },
    [isAuthed, setProfile]
  );

  const refreshFeed = useCallback(async () => {
    try {
      const feed = await api.getPosts();
      if (Array.isArray(feed.posts)) setPosts(feed.posts);
      if (feed.users && typeof feed.users === "object") setFeedUsersById((prev) => ({ ...prev, ...feed.users }));
    } catch {
      // Keep local cache when offline or server unreachable.
    }
  }, [setPosts]);

  const upsertFeedPost = useCallback((next) => {
    if (!next?.id) return;
    const idStr = String(next.id);
    setPosts((ps) => {
      const i = ps.findIndex((p) => String(p.id) === idStr);
      if (i === -1) return [{ ...next }, ...ps];
      const xs = [...ps];
      xs[i] = { ...xs[i], ...next };
      return xs;
    });
  }, [setPosts]);

  const applySessionProfile = useCallback(({ name, profile: nextProfile }) => {
    setIsAuthed(true);
    if (nextProfile) setProfile((p) => ({ ...p, ...nextProfile }));
    else if (name) setProfile((p) => ({ ...p, name }));
  }, [setProfile, setIsAuthed]);

  const signIn = ({ name, profile: nextProfile } = {}) => {
    applySessionProfile({ name, profile: nextProfile });
  };

  const signOut = async () => {
    try {
      await api.logoutAccount();
    } catch {
      /* ignore network errors */
    }
    setIsAuthed(false);
    setRole("student");
    setAccountEmail("");
    setUsernameCooldownUntil(null);
  };

  /** Bootstrap server feed / session cookie when running inside Next.js. */
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function bootstrap() {
      try {
        const feed = await api.getPosts();

        let me = null;
        try {
          me = await api.getMe();
        } catch (e) {
          if (e?.status === 401) setIsAuthed(false);
          me = null;
        }

        if (cancelled) return;

        if (Array.isArray(feed.posts)) setPosts(feed.posts);
        if (feed.users && typeof feed.users === "object") setFeedUsersById((prev) => ({ ...prev, ...feed.users }));

        if (me?.profile) hydrateAccountFromServer(me);

        try {
          const ld = await api.getLanding();
          if (!cancelled && ld?.badgeColors && typeof ld.badgeColors === "object") applyLandingExtras(ld);
        } catch {
          /* keep defaults */
        }
      } catch {
        // Offline / SSR mismatch — defaults + local cache stay authoritative.
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setPosts, setIsAuthed, hydrateAccountFromServer, applyLandingExtras]);

  /** Light presence pings while signed in — other clients can subscribe via `/api/presence`. */
  useEffect(() => {
    if (!isAuthed) return undefined;
    if (typeof window === "undefined") return undefined;

    const tick = () => {
      api.postPresence().catch(() => {});
    };
    tick();
    const id = window.setInterval(tick, 45_000);
    return () => window.clearInterval(id);
  }, [isAuthed]);

  /** When signed in, persist prefs · friends · subs · activities (profile uses persistFullProfile or PATCH /api/profile flows). */
  useEffect(() => {
    if (!isAuthed || typeof window === "undefined") return undefined;
    const snap = JSON.stringify({ prefs, friends, subs, activities });
    if (snap === lastSyncedExtrasRef.current) return undefined;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          await api.patchAccount({ prefs, friends, subs, activities });
          lastSyncedExtrasRef.current = snap;
        } catch {
          /* offline / transient */
        }
      })();
    }, 1000);
    return () => window.clearTimeout(t);
  }, [isAuthed, prefs, friends, subs, activities]);

  // Apply mode-specific css vars to <body> so any tailwind/utility falls back nicely
  useEffect(() => {
    if (typeof document === "undefined") return;
    const tokens = getThemeTokens(prefs.mode);
    document.body.style.background = tokens.appBg;
    document.body.style.color = tokens.text;
  }, [prefs.mode]);

  useEffect(() => {
    if (page !== "profile") {
      setProfileVisitUserId(null);
      setVisitedProfileFriends(null);
    }
  }, [page]);

  const prevPageRef = useRef(page);
  useEffect(() => {
    const prev = prevPageRef.current;
    prevPageRef.current = page;
    if (prev === "post" && page !== "post") {
      setActivePostId(null);
      setPostNotFoundId(null);
    }
  }, [page]);

  const users = useMemo(() => {
    const r = role || "student";
    return {
      ...feedUsersById,
      [profile.id]: { ...profile, forumRole: r },
    };
  }, [profile, feedUsersById, role]);

  const mergeFeedUsers = useCallback((incoming) => {
    if (!incoming || typeof incoming !== "object") return;
    setFeedUsersById((prev) => ({ ...prev, ...incoming }));
  }, []);

  const loadCommentsFromServer = useCallback(
    async (postId) => {
      try {
        const data = await api.getComments(postId);
        mergeFeedUsers(data.users);
        const key = String(postId);
        const rows = Array.isArray(data.comments) ? data.comments : [];
        setCommentsByPostId((m) => ({ ...m, [key]: rows }));
      } catch {
        /* ignore */
      }
    },
    [mergeFeedUsers]
  );

  const publishPost = useCallback(
    async (content, tag, imageUrl = "") => {
      await api.createPost({ content, tag, imageUrl });
      await refreshFeed();
    },
    [refreshFeed]
  );

  const applyVisitProfileBundle = useCallback((bundle) => {
    if (!bundle?.profile?.id) return null;
    const id = String(bundle.profile.id);
    setVisitedProfileFriends({ userId: id, friendIds: Array.isArray(bundle.friendIds) ? bundle.friendIds : [] });
    setFeedUsersById((prev) => ({
      ...prev,
      ...(bundle.friendMiniUsers && typeof bundle.friendMiniUsers === "object" ? bundle.friendMiniUsers : {}),
      [bundle.profile.id]: { ...DEFAULT_PROFILE, ...bundle.profile },
    }));
    return id;
  }, []);

  const fetchAndMergeVisit = useCallback(
    (userId) => {
      const id = String(userId || "").trim();
      if (!id) return Promise.resolve(null);
      return api.getVisitProfile(id).then((bundle) => {
        if (!bundle?.profile || String(bundle.profile.id) !== id) return null;
        applyVisitProfileBundle(bundle);
        return bundle;
      });
    },
    [applyVisitProfileBundle]
  );

  const fetchAndMergeVisitByHandle = useCallback(
    (handle) => {
      const h = String(handle || "").trim();
      if (!h) return Promise.resolve(null);
      return api.getVisitProfileByHandle(h).then((bundle) => {
        if (!bundle?.profile?.id) return null;
        applyVisitProfileBundle(bundle);
        return bundle;
      });
    },
    [applyVisitProfileBundle]
  );

  const visitUserProfile = useCallback(
    (userId) => {
      if (!userId) return;
      const id = String(userId);
      setProfileNotFoundHandle(null);
      setProfileVisitUserId(id);
      setVisitedProfileFriends(null);
      setPage("profile");
      void fetchAndMergeVisit(id).catch(() => {});
    },
    [setPage, fetchAndMergeVisit]
  );

  const reloadVisitedProfile = useCallback(() => {
    const id = profileVisitUserId;
    if (!id) return;
    void fetchAndMergeVisit(id).catch(() => {});
  }, [profileVisitUserId, fetchAndMergeVisit]);

  const resetProfileVisit = useCallback(() => {
    setProfileVisitUserId(null);
    setVisitedProfileFriends(null);
    setProfileNotFoundHandle(null);
    if (typeof window !== "undefined" && /^#profile@/i.test(window.location.hash)) {
      const path = `${window.location.pathname}${window.location.search || ""}`;
      window.history.replaceState(null, "", path);
    }
  }, []);

  const openPost = useCallback((postId) => {
    const id = String(postId || "").trim();
    if (!id) return;
    setPostNotFoundId(null);
    setActivePostId(id);
    setPage("post");
  }, [setPage]);

  const hydratePostFromServer = useCallback(
    async (postId) => {
      const id = String(postId || "").trim();
      if (!id) return;
      setActivePostId(id);
      setPostNotFoundId(null);
      setPage("post");
      try {
        const data = await api.getPost(id);
        if (data?.post) {
          mergeFeedUsers(data.users);
          upsertFeedPost(data.post);
          setPostNotFoundId(null);
        } else {
          setPostNotFoundId(id);
        }
      } catch {
        setPostNotFoundId(id);
      }
    },
    [mergeFeedUsers, upsertFeedPost, setPage]
  );

  const addActivity = (a) => {
    setActivities((xs) => [{ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, ts: Date.now(), ...a }, ...xs].slice(0, 200));
  };

  const addComment = async (postId, { userId, text, imageUrl = "", parentId = null }) => {
    const key = String(postId);
    try {
      const out = await api.postComment(postId, text, imageUrl, parentId);
      mergeFeedUsers(out.users);
      if (out.post) upsertFeedPost(out.post);

      const row = out.comment;
      if (row) {
        setCommentsByPostId((m) => {
          const prev = m[key] || [];
          return { ...m, [key]: [...prev.filter((x) => x?.id !== row.id), row] };
        });
      }

      addActivity({ type: "comment", postId: key, userId });
    } catch {
      setCommentsByPostId((m) => {
        const prev = m[key] || m[postId] || [];
        const next = [
          ...prev,
          {
            id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            userId,
            text,
            ts: Date.now(),
            parentId: parentId && String(parentId).trim() ? String(parentId).trim() : null,
          },
        ];
        return { ...m, [key]: next };
      });
      addActivity({ type: "comment", postId: key, userId });
    }
  };

  const updatePost = async (postId, patch) => {
    const idStr = String(postId);
    setPosts((ps) => ps.map((p) => (String(p.id) === idStr ? { ...p, ...patch } : p)));
    addActivity({ type: "edit_post", postId: idStr, userId: profile.id });

    if (patch?.content != null && isAuthed) {
      try {
        const out = await api.patchPost(postId, String(patch.content));
        if (out?.post) upsertFeedPost(out.post);
      } catch (e) {
        if (typeof window !== "undefined" && e?.status === 413) {
          window.alert(String(e.message || "Edited post exceeds the maximum length."));
        }
        /* Moderator edits on other authors' posts may stay local-only on other failures. */
      }
    }
  };

  const toggleBookmark = async (postId) => {
    try {
      const out = await api.togglePostBookmark(postId);
      if (out?.post) upsertFeedPost(out.post);
      addActivity({ type: "bookmark", postId, userId: profile.id });
    } catch {
      setPosts((ps) => ps.map((p) => (String(p.id) === String(postId) ? { ...p, bookmarked: !p.bookmarked } : p)));
      addActivity({ type: "bookmark", postId, userId: profile.id });
    }
  };

  const likePost = async (postId) => {
    try {
      const out = await api.togglePostLike(postId);
      if (out?.post) upsertFeedPost(out.post);
      addActivity({ type: "like", postId, userId: profile.id });
    } catch {
      setPosts((ps) => ps.map((p) => (String(p.id) === String(postId) ? { ...p, likes: p.likes + 1 } : p)));
      addActivity({ type: "like", postId, userId: profile.id });
    }
  };

  const reportPost = (postId, reason = "Reported") => {
    setReports((rs) => [
      { id: `r_${Date.now()}_${Math.random().toString(16).slice(2)}`, postId, reason, by: profile.id, ts: Date.now(), status: "open" },
      ...rs,
    ].slice(0, 500));
    addActivity({ type: "report", postId, userId: profile.id, reason });
  };

  // -------- Moderation --------
  const resolveReport = (id, status = "resolved") => {
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  };
  const deletePost = (postId) => {
    setPosts((ps) => ps.filter((p) => p.id !== postId));
    addActivity({ type: "mod_delete_post", postId, userId: profile.id });
  };
  const pinPost = (postId) => {
    setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, pinned: !p.pinned } : p)));
  };
  const banUser = (userId) => {
    setBannedUserIds((b) => (b.includes(userId) ? b : [...b, userId]));
    addActivity({ type: "mod_ban", userId });
  };
  const unbanUser = (userId) => {
    setBannedUserIds((b) => b.filter((x) => x !== userId));
    addActivity({ type: "mod_unban", userId });
  };

  const sharePost = async (postId) => {
    const id = encodeURIComponent(String(postId || "").trim());
    const url = typeof window !== "undefined" && id ? `${window.location.origin}/p/${id}` : "";
    try {
      if (url) await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
    addActivity({ type: "share", postId, userId: profile.id });
  };

  const shareComment = async (postId, commentId) => {
    const p = encodeURIComponent(String(postId || "").trim());
    const c = encodeURIComponent(String(commentId || "").trim());
    const url = typeof window !== "undefined" && p && c ? `${window.location.origin}/p/${p}#c-${c}` : "";
    try {
      if (url) await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
    addActivity({ type: "share_comment", postId: String(postId), commentId: String(commentId), userId: profile.id });
  };

  // -------- Friends --------
  const acceptFriend = (id) => {
    setFriends((f) => ({
      ...f,
      pending: f.pending.filter((x) => x !== id),
      friends: f.friends.includes(id) ? f.friends : [...f.friends, id],
    }));
    addActivity({ type: "friend_accept", userId: id });
  };
  const declineFriend = (id) => {
    setFriends((f) => ({ ...f, pending: f.pending.filter((x) => x !== id) }));
    addActivity({ type: "friend_decline", userId: id });
  };
  const removeFriend = (id) => {
    setFriends((f) => ({ ...f, friends: f.friends.filter((x) => x !== id) }));
    addActivity({ type: "friend_remove", userId: id });
  };
  const cancelOutgoing = (id) => {
    setFriends((f) => ({ ...f, outgoing: f.outgoing.filter((x) => x !== id) }));
  };
  const sendFriendRequest = (id) => {
    setFriends((f) => ({ ...f, outgoing: f.outgoing.includes(id) ? f.outgoing : [...f.outgoing, id] }));
    addActivity({ type: "friend_request", userId: id });
  };

  // -------- Subscriptions --------
  const toggleTagSub = (tag) => {
    setSubs((s) => {
      const has = s.tags.find((t) => t.tag === tag);
      return {
        ...s,
        tags: has ? s.tags.filter((t) => t.tag !== tag) : [...s.tags, { tag, notify: true }],
      };
    });
  };
  const setTagNotify = (tag, notify) => {
    setSubs((s) => ({ ...s, tags: s.tags.map((t) => (t.tag === tag ? { ...t, notify } : t)) }));
  };
  const toggleFollow = (userId) => {
    setSubs((s) => ({
      ...s,
      follows: s.follows.includes(userId) ? s.follows.filter((x) => x !== userId) : [...s.follows, userId],
    }));
  };

  // -------- Preferences / Theme --------
  const updatePrefs = (patch) => setPrefs((p) => ({ ...p, ...patch }));
  const toggleMode = () => setPrefs((p) => ({ ...p, mode: p.mode === "dark" ? "light" : "dark" }));

  const tokens = useMemo(() => getThemeTokens(prefs.mode), [prefs.mode]);

  /** See `TalksRouterSync`: block state→URL push while pathname hydration (incl. async profile fetch) is in flight. */
  const talksUrlPushDeferDepthRef = useRef(0);
  const talksPathnameHydration = useMemo(
    () => ({
      begin: () => {
        talksUrlPushDeferDepthRef.current += 1;
      },
      end: () => {
        queueMicrotask(() => {
          talksUrlPushDeferDepthRef.current = Math.max(0, talksUrlPushDeferDepthRef.current - 1);
        });
      },
      shouldDeferTalksPush: () => talksUrlPushDeferDepthRef.current > 0,
    }),
    []
  );

  const value = useMemo(
    () => ({
      page,
      setPage,
      profileVisitUserId,
      fetchAndMergeVisitByHandle,
      setProfileVisitUserId,
      profileNotFoundHandle,
      setProfileNotFoundHandle,
      talksPathnameHydration,
      visitedProfileFriends,
      visitUserProfile,
      reloadVisitedProfile,
      resetProfileVisit,
      profile,
      setProfile,
      users,
      posts,
      setPosts,
      commentsByPostId,
      addComment,
      updatePost,
      toggleBookmark,
      likePost,
      refreshFeed,
      publishPost,
      loadCommentsFromServer,
      reportPost,
      sharePost,
      shareComment,
      activePostId,
      setActivePostId,
      postNotFoundId,
      openPost,
      hydratePostFromServer,
      activities,
      // friends
      friends,
      acceptFriend,
      declineFriend,
      removeFriend,
      cancelOutgoing,
      sendFriendRequest,
      // subs
      subs,
      toggleTagSub,
      setTagNotify,
      toggleFollow,
      // prefs / theme
      prefs,
      updatePrefs,
      toggleMode,
      tokens,
      // auth
      isAuthed,
      role,
      accountEmail,
      isStaff: role === "admin" || role === "moderator",
      usernameCooldownUntil,
      signIn,
      signOut,
      hydrateAccountFromServer,
      persistFullProfile,
      badgeColors,
      applyLandingExtras,
      // moderation
      reports,
      resolveReport,
      deletePost,
      pinPost,
      banUser,
      unbanUser,
      bannedUserIds,
    }),
    [
      page,
      profileVisitUserId,
      fetchAndMergeVisitByHandle,
      profileNotFoundHandle,
      talksPathnameHydration,
      visitedProfileFriends,
      visitUserProfile,
      reloadVisitedProfile,
      resetProfileVisit,
      profile,
      users,
      posts,
      commentsByPostId,
      activities,
      friends,
      subs,
      prefs,
      tokens,
      isAuthed,
      role,
      accountEmail,
      usernameCooldownUntil,
      reports,
      bannedUserIds,
      refreshFeed,
      publishPost,
      loadCommentsFromServer,
      shareComment,
      activePostId,
      postNotFoundId,
      openPost,
      hydratePostFromServer,
      hydrateAccountFromServer,
      persistFullProfile,
      badgeColors,
      applyLandingExtras,
    ]
  );
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const v = useContext(AppStateContext);
  if (!v) throw new Error("useAppState must be used within AppStateProvider");
  return v;
}

