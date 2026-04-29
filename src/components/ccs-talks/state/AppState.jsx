"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_PROFILE, MOCK_POSTS, MOCK_USERS } from "../config/appConfig";
import { useLocalStorageState } from "./useLocalStorageState";
import { getThemeTokens } from "../theme";

const AppStateContext = createContext(null);

const DEFAULT_FRIENDS = {
  // friend ids referencing MOCK_USERS keys
  friends: ["u_renz", "u_maica", "u_tricia"],
  pending: ["u_josh"], // incoming friend requests
  outgoing: ["u_miguel"],
};

const DEFAULT_SUBS = {
  // tags subscribed to (with notify flag)
  tags: [
    { tag: "Academics", notify: true },
    { tag: "Events", notify: true },
    { tag: "Tech", notify: false },
  ],
  // user ids the current profile follows
  follows: ["u_renz", "u_tricia"],
};

const DEFAULT_PREFS = {
  mode: "dark", // "dark" | "light"
  compact: false,
  language: "English",
  showSensitive: false,
  defaultPostTag: "General",
  feedSort: "latest", // latest | top | mixed
  hideReportedAfter: 5,
  // notifications
  notifyMentions: true,
  notifyReplies: true,
  notifyFriendRequests: true,
  notifyDigest: false,
  notifySubscriptions: true,
  // privacy
  profileVisibility: "Public", // Public | Friends | Private
  allowDMs: "Friends", // Everyone | Friends | None
  showOnlineStatus: true,
  // accessibility
  reduceMotion: false,
  largerText: false,
};

export function AppStateProvider({ children }) {
  const [profile, setProfile] = useLocalStorageState("ccs.profile.v1", DEFAULT_PROFILE);
  const [page, setPage] = useState("landing");
  const [posts, setPosts] = useLocalStorageState("ccs.posts.v1", MOCK_POSTS);
  const [commentsByPostId, setCommentsByPostId] = useLocalStorageState("ccs.comments.v1", {});
  const [activities, setActivities] = useLocalStorageState("ccs.activities.v1", []);
  const [friends, setFriends] = useLocalStorageState("ccs.friends.v1", DEFAULT_FRIENDS);
  const [subs, setSubs] = useLocalStorageState("ccs.subs.v1", DEFAULT_SUBS);
  const [prefs, setPrefs] = useLocalStorageState("ccs.prefs.v1", DEFAULT_PREFS);
  const [isAuthed, setIsAuthed] = useLocalStorageState("ccs.authed.v1", false);
  const [reports, setReports] = useLocalStorageState("ccs.reports.v1", []);
  const [bannedUserIds, setBannedUserIds] = useLocalStorageState("ccs.banned.v1", []);

  const signIn = ({ name } = {}) => {
    setIsAuthed(true);
    if (name) setProfile((p) => ({ ...p, name }));
  };
  const signOut = () => setIsAuthed(false);

  // Apply mode-specific css vars to <body> so any tailwind/utility falls back nicely
  useEffect(() => {
    if (typeof document === "undefined") return;
    const tokens = getThemeTokens(prefs.mode);
    document.body.style.background = tokens.appBg;
    document.body.style.color = tokens.text;
  }, [prefs.mode]);

  const users = useMemo(() => {
    return {
      ...MOCK_USERS,
      [profile.id]: profile,
    };
  }, [profile]);

  const addActivity = (a) => {
    setActivities((xs) => [{ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, ts: Date.now(), ...a }, ...xs].slice(0, 200));
  };

  const addComment = (postId, { userId, text }) => {
    setCommentsByPostId((m) => {
      const prev = m[postId] || [];
      const next = [...prev, { id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, userId, text, ts: Date.now() }];
      return { ...m, [postId]: next };
    });
    addActivity({ type: "comment", postId, userId });
  };

  const updatePost = (postId, patch) => {
    setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, ...patch } : p)));
    addActivity({ type: "edit_post", postId, userId: profile.id });
  };

  const toggleBookmark = (postId) => {
    setPosts((ps) =>
      ps.map((p) => (p.id === postId ? { ...p, bookmarked: !p.bookmarked } : p))
    );
    addActivity({ type: "bookmark", postId, userId: profile.id });
  };

  const likePost = (postId) => {
    setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p)));
    addActivity({ type: "like", postId, userId: profile.id });
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
    const url = typeof window !== "undefined" ? `${window.location.origin}/#post-${postId}` : `post-${postId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
    addActivity({ type: "share", postId, userId: profile.id });
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

  const value = useMemo(
    () => ({
      page,
      setPage,
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
      reportPost,
      sharePost,
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
      signIn,
      signOut,
      // moderation
      reports,
      resolveReport,
      deletePost,
      pinPost,
      banUser,
      unbanUser,
      bannedUserIds,
    }),
    [page, profile, users, posts, commentsByPostId, activities, friends, subs, prefs, tokens, isAuthed, reports, bannedUserIds]
  );
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const v = useContext(AppStateContext);
  if (!v) throw new Error("useAppState must be used within AppStateProvider");
  return v;
}

