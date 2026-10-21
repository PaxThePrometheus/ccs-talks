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
import { showToast } from "./toastBus";
import { usePathname } from "next/navigation";
import { buildTalksPathname, parseTalksPathname } from "../routing/talksPaths";
import { navigateTalks } from "../routing/navigateTalks";

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [profile, setProfile] = useLocalStorageState("ccs.profile.v1", DEFAULT_PROFILE);
  const [feedUsersById, setFeedUsersById] = useState({});
  const pathname = usePathname() || "/";
  const route = useMemo(() => parseTalksPathname(pathname), [pathname]);
  const page = route.page;
  const setPage = useCallback((nextPage, options) => {
    const path = buildTalksPathname({ page: nextPage });
    if (path) navigateTalks(path, options);
  }, []);
  const [posts, setPosts] = useState([]);
  const [commentsByPostId, setCommentsByPostId] = useState({});
  const [activities, setActivities] = useLocalStorageState("ccs.activities.v1", []);
  const [friends, setFriends] = useLocalStorageState("ccs.friends.v1", CCS_DEFAULT_FRIENDS);
  const [subs, setSubs] = useLocalStorageState("ccs.subs.v1", CCS_DEFAULT_SUBS);
  const [prefs, setPrefs] = useLocalStorageState("ccs.prefs.v1", CCS_DEFAULT_PREFS);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [accountReady, setAccountReady] = useState(false);
  /** Server-truth role for the current viewer; defaults to "student" until /api/auth/me responds. */
  const [role, setRole] = useState("student");
  const [accountEmail, setAccountEmail] = useState("");
  /** When set, Profile screen shows this user's public card (read-only) until cleared. */
  const [loadedProfileId, setProfileVisitUserId] = useState(null);
  /** Friend id order for the profile being visited (from server); cleared with visit reset. */
  const [visitedProfileFriends, setVisitedProfileFriends] = useState(null);
  /** Milliseconds epoch when username edit is allowed again (server: `usernameCooldownUntil`). */
  const [usernameCooldownUntil, setUsernameCooldownUntil] = useState(null);
  /** Badge label → hex map from `/api/landing` (Forum poll keeps it fresh). */
  const [badgeColors, setBadgeColors] = useState({});
  /** Forum post tag label → accent hex from landing CMS (`tagColors` in JSON). */
  const [tagColors, setTagColors] = useState({});
  /** Deep-link post screen (`/p/{id}`). */
  const activePostId = route.postId || null;
  /** When set, post detail shows “not found” for this id (URL stays `/p/…`). */
  const [postNotFoundId, setPostNotFoundId] = useState(null);
  /** When set, profile screen shows “user not found” for this handle. */
  const [missingProfileHandle, setProfileNotFoundHandle] = useState(null);
  const [profileLoadError, setProfileRouteError] = useState("");
  const [resolvedProfileHandle, setResolvedProfileHandle] = useState(null);
  const profileRouteLoading = !!route.profileHandle && resolvedProfileHandle !== route.profileHandle;
  const profileVisitUserId = route.profileHandle && !profileRouteLoading ? loadedProfileId : null;
  const profileNotFoundHandle = route.profileHandle === missingProfileHandle ? missingProfileHandle : null;
  const profileRouteError = route.profileHandle && !profileRouteLoading ? profileLoadError : "";

  const applyLandingExtras = useCallback((d) => {
    if (d?.badgeColors && typeof d.badgeColors === "object") setBadgeColors(d.badgeColors);
    if (d?.tagColors && typeof d.tagColors === "object") setTagColors(d.tagColors);
  }, []);

  /** Cursor for `/api/posts` pagination (newest-first). */
  const feedNextCursorRef = useRef(null);
  const [feedNextCursor, setFeedNextCursor] = useState(null);
  const forumActiveTagRef = useRef("All");
  const forumSearchSeedRef = useRef({ q: "", tag: "" });
  const postsRef = useRef(posts);
  const pageRef = useRef(page);
  const activePostIdRef = useRef(activePostId);
  const commentsByPostIdRef = useRef(commentsByPostId);
  useEffect(() => {
    postsRef.current = posts;
    pageRef.current = page;
    activePostIdRef.current = activePostId;
    commentsByPostIdRef.current = commentsByPostId;
  }, [posts, page, activePostId, commentsByPostId]);
  const [onlineByUserId, setOnlineByUserId] = useState({});

  /** Skip first debounced PATCH after we just applied server snapshot (prevents PATCH loop). */
  const lastSyncedExtrasRef = useRef("");
  const sessionEpochRef = useRef(0);

  const hydrateAccountFromServer = useCallback(
    (me) => {
      if (!me?.profile) return;
      setIsAuthed(true);
      setAuthReady(true);
      setAccountReady(true);
      setProfile((p) => ({ ...DEFAULT_PROFILE, ...p, ...me.profile }));
      setPrefs(normalizePrefs(me.prefs));
      setFriends(normalizeFriends(me.friends));
      setSubs(normalizeSubs(me.subs));
      setActivities(normalizeActivities(me.activities));
      setRole(me.role || "student");
      setUsernameCooldownUntil(typeof me.usernameCooldownUntil === "number" ? me.usernameCooldownUntil : null);
      setAccountEmail(typeof me.email === "string" ? me.email : "");
      /** Friends are not PATCH-synced; `/api/friends` is the source of truth. */
      lastSyncedExtrasRef.current = JSON.stringify({
        prefs: normalizePrefs(me.prefs),
        subs: normalizeSubs(me.subs),
        activities: normalizeActivities(me.activities),
      });
    },
    [setProfile, setIsAuthed, setPrefs, setFriends, setSubs, setActivities, setAccountEmail, setUsernameCooldownUntil]
  );

  const persistFullProfile = useCallback(
    async (patch) => {
      if (!isAuthed) return false;
      try {
        const out = await api.patchProfile(patch);
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
        return true;
      } catch (e) {
        if (e?.status === 429) {
          const na = e?.data?.nextAllowedAt;
          const hint = typeof na === "number" ? ` Try again after ${new Date(na).toLocaleString()}.` : "";
          window.alert(String(e.message || "Username changes are temporarily limited.") + hint);
          if (typeof na === "number") setUsernameCooldownUntil(na);
        } else if (e?.status === 409) window.alert("That username is already taken.");
        else if (e?.status === 413) window.alert(e.message || "Image too large to save.");
        else console.warn("[ccs] persistFullProfile", e);
        return false;
      }
    },
    [isAuthed, setProfile]
  );

  const reloadForumFeed = useCallback(
    async (tag = "All") => {
      forumActiveTagRef.current = tag;
      try {
        const feed = await api.getPosts({ tag: tag === "All" ? undefined : tag, limit: 30 });
        if (Array.isArray(feed.posts)) setPosts(feed.posts);
        if (feed.users && typeof feed.users === "object") setFeedUsersById((prev) => ({ ...prev, ...feed.users }));
        const nc = feed.nextCursor != null && feed.nextCursor !== undefined ? feed.nextCursor : null;
        feedNextCursorRef.current = nc;
        setFeedNextCursor(nc);
      } catch (e) {
        if(e?.status===401){setPosts([]);setCommentsByPostId({});setFeedUsersById({});}
        showToast(e?.message || "Couldn’t refresh the feed.", "error");
      }
    },
    [setPosts]
  );

  const loadMoreFeedPosts = useCallback(async () => {
    const tag = forumActiveTagRef.current;
    const cur = feedNextCursorRef.current;
    if (!cur) return { ok: true, hasMore: false };
    try {
      const feed = await api.getPosts({
        tag: tag === "All" ? undefined : tag,
        limit: 30,
        cursor: cur,
      });
      if (feed.users && typeof feed.users === "object") setFeedUsersById((prev) => ({ ...prev, ...feed.users }));
      if (Array.isArray(feed.posts) && feed.posts.length) {
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => String(p.id)));
          const appended = feed.posts.filter((p) => p && !seen.has(String(p.id)));
          return [...prev, ...appended];
        });
      }
      const nc = feed.nextCursor != null && feed.nextCursor !== undefined ? feed.nextCursor : null;
      feedNextCursorRef.current = nc;
      setFeedNextCursor(nc);
      return { ok: true, hasMore: !!nc };
    } catch (e) {
      showToast(e?.message || "Couldn’t load more posts.", "error");
      return { ok: false, hasMore: false };
    }
  }, [setPosts]);

  const refreshFeed = useCallback(async () => {
    await reloadForumFeed(forumActiveTagRef.current);
  }, [reloadForumFeed]);

  const openForumSearchWith = useCallback((q, tag = "") => {
    forumSearchSeedRef.current = {
      q: String(q || "").trim(),
      tag: String(tag || "").trim(),
    };
    setPage("search");
  }, [setPage]);

  const peekForumSearchSeed = useCallback(() => ({ ...forumSearchSeedRef.current }), []);

  const clearForumSearchSeed = useCallback(() => {
    forumSearchSeedRef.current = { q: "", tag: "" };
  }, []);

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
    sessionEpochRef.current += 1;
    setIsAuthed(true);
    setAuthReady(true);
    setAccountReady(false);
    if (nextProfile) setProfile((p) => ({ ...p, ...nextProfile }));
    else if (name) setProfile((p) => ({ ...p, name }));
  }, [setProfile, setIsAuthed]);

  const signIn = ({ name, profile: nextProfile } = {}) => {
    applySessionProfile({ name, profile: nextProfile });
  };

  const signOut = async () => {
    try {
      await api.logoutAccount();
    } catch(error) {
      showToast(error?.message || "Could not sign out. Please retry.","error");return false;
    }
    setPosts([]);setCommentsByPostId({});setFeedUsersById({});
    sessionEpochRef.current += 1;
    setIsAuthed(false);
    setAccountReady(false);
    setRole("student");
    setAccountEmail("");
    setUsernameCooldownUntil(null);
    return true;
  };

  // Content is scoped to this tab's authorized API reads, not hydrated from
  // a previous account's persistent cache after guest visibility changes.
  useEffect(()=>{try{localStorage.removeItem("ccs.authed.v1");localStorage.removeItem("ccs.posts.v1");localStorage.removeItem("ccs.comments.v1");}catch{}},[]);

  /** Bootstrap session and shared public metadata once for this mounted shell. */
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const epoch = sessionEpochRef.current;

    async function bootstrap() {
      await Promise.allSettled([
        api.getMe().then(me => {
          if (!cancelled && epoch === sessionEpochRef.current && me?.profile) hydrateAccountFromServer(me);
        }).catch(error => {
          if (!cancelled && epoch === sessionEpochRef.current && error?.status === 401) setIsAuthed(false);
        }).finally(() => { if (!cancelled && epoch === sessionEpochRef.current) setAuthReady(true); }),
        api.getLanding().then(data => { if (!cancelled) applyLandingExtras(data); }),
      ]);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setPosts, setIsAuthed, hydrateAccountFromServer, applyLandingExtras]);

  // The forum owns its tag-specific feed load; detail routes load one post.
  // Secondary screens need a feed only when opened, never on login/register.
  useEffect(() => {
    if (["profile", "bookmarks", "activities", "subs"].includes(page) && authReady) void refreshFeed();
  }, [page, authReady, refreshFeed]);

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

  /** Poll online state for authors visible on forum / post detail (guests OK). */
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let cancelled = false;

    const collectIds = () => {
      const idSet = new Set();
      const curPosts = postsRef.current || [];
      for (const p of curPosts) {
        if (p?.userId) idSet.add(p.userId);
        if (idSet.size >= 64) break;
      }
      if (pageRef.current === "post" && activePostIdRef.current) {
        const pid = String(activePostIdRef.current);
        const post = curPosts.find((x) => String(x.id) === pid);
        if (post?.userId) idSet.add(post.userId);
        const rows = commentsByPostIdRef.current[pid] || [];
        for (const r of rows) {
          if (r?.userId) idSet.add(r.userId);
          if (idSet.size >= 64) break;
        }
      }
      return [...idSet].slice(0, 64);
    };

    const poll = async () => {
      if (pageRef.current !== "forum" && pageRef.current !== "post") return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const ids = collectIds();
      if (!ids.length) return;
      try {
        const data = await api.getPresence(ids);
        if (cancelled || !data?.online || typeof data.online !== "object") return;
        setOnlineByUserId((prev) => ({ ...prev, ...data.online }));
      } catch {
        /* ignore */
      }
    };

    void poll();
    const id = window.setInterval(poll, 30_000);
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [page, activePostId]);

  /** When signed in, persist prefs · subs · activities (friends use `/api/friends`). */
  useEffect(() => {
    if (!isAuthed || !accountReady || typeof window === "undefined") return undefined;
    const snap = JSON.stringify({ prefs, subs, activities });
    if (snap === lastSyncedExtrasRef.current) return undefined;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          await api.patchAccount({ prefs, subs, activities });
          lastSyncedExtrasRef.current = snap;
        } catch {
          /* offline / transient — prefs stay local */
        }
      })();
    }, 1000);
    return () => window.clearTimeout(t);
  }, [isAuthed, accountReady, prefs, subs, activities]);

  // Apply mode-specific css vars to <body> so any tailwind/utility falls back nicely
  useEffect(() => {
    if (typeof document === "undefined") return;
    const tokens = getThemeTokens(prefs.mode);
    document.body.style.background = tokens.appBg;
    document.body.style.color = tokens.text;
  }, [prefs.mode]);

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
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e };
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
    (handle, isCurrent = () => true) => {
      const h = String(handle || "").trim();
      if (!h) return Promise.resolve(null);
      return api.getVisitProfileByHandle(h).then((bundle) => {
        if (!isCurrent()) return null;
        if (!bundle?.profile?.id) return null;
        applyVisitProfileBundle(bundle);
        return bundle;
      });
    },
    [applyVisitProfileBundle]
  );

  const visitUserProfile = useCallback(
    (userId) => {
      const id = String(userId || "").trim();
      if (!id) return;
      const handle = users[id]?.handle;
      if (handle) {
        navigateTalks(`/profile/${encodeURIComponent(handle)}`);
        return;
      }
      // Some relationship lists only have ids. Resolve once before opening a
      // shareable route; a late response must not undo a newer navigation.
      const from = window.location.href;
      void fetchAndMergeVisit(id).then(bundle => {
        if (window.location.href === from && bundle?.profile?.handle) {
          navigateTalks(`/profile/${encodeURIComponent(bundle.profile.handle)}`);
        }
      }).catch(e => showToast(e?.message || "Couldn’t load this profile.", "error"));
    },
    [users, fetchAndMergeVisit]
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
    setResolvedProfileHandle(null);
  }, []);

  const openPost = useCallback((postId) => {
    const id = String(postId || "").trim();
    if (!id) return;
    navigateTalks(`/p/${encodeURIComponent(id)}`);
  }, []);

  const hydratePostFromServer = useCallback(
    async (postId, isCurrent = () => true) => {
      const id = String(postId || "").trim();
      if (!id) return;
      setPostNotFoundId(null);
      try {
        const data = await api.getPost(id);
        if (!isCurrent()) return;
        if (data?.post) {
          mergeFeedUsers(data.users);
          upsertFeedPost(data.post);
          setPostNotFoundId(null);
        } else {
          setPostNotFoundId(id);
        }
      } catch {
        if (isCurrent()) setPostNotFoundId(id);
      }
    },
    [mergeFeedUsers, upsertFeedPost]
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
    } catch (e) {
      showToast(e?.message || "Couldn’t post comment.", "error");
    }
  };

  const updatePost = async (postId, patch) => {
    if (!isAuthed || typeof patch?.content!=="string") return false;
    try {
      const out=await api.patchPost(postId,patch.content);
      if(out?.post)upsertFeedPost(out.post);
      addActivity({type:"edit_post",postId:String(postId),userId:profile.id});
      return true;
    }catch(error){showToast(error?.message || "Could not save this post.","error");return false;}
  };

  const toggleBookmark = async (postId) => {
    try {
      const out = await api.togglePostBookmark(postId);
      if (out?.post) upsertFeedPost(out.post);
      addActivity({ type: "bookmark", postId, userId: profile.id });
    } catch (e) {
      showToast(e?.message || "Couldn’t update bookmark.", "error");
    }
  };

  const likePost = async (postId) => {
    try {
      const out = await api.togglePostLike(postId);
      if (out?.post) upsertFeedPost(out.post);
      addActivity({ type: "like", postId, userId: profile.id });
    } catch (e) {
      showToast(e?.message || "Couldn’t update like.", "error");
    }
  };

  const reportPost = async (postId, reason = "Reported") => {
    try {
      await api.submitPostReport(postId, reason);
      showToast("Thanks — moderators will review this report.", "success");
      setPosts((ps) =>
        ps.map((p) =>
          String(p.id) === String(postId)
            ? { ...p, openReportCount: Math.max(0, Number(p.openReportCount ?? 0) + 1) }
            : p
        )
      );
      addActivity({ type: "report", postId, userId: profile.id, reason });
    } catch (e) {
      if (e?.status === 409) showToast(String(e.message || "You already reported this post."), "info");
      else showToast(e?.message || "Couldn’t submit report.", "error");
    }
  };

  // -------- Moderation (staff session; same `/api/admin/*` as Admin Console) --------
  const deletePost = async (postId) => {
    try {
      await api.adminDeletePost(postId);
      setPosts((ps) => ps.filter((p) => String(p.id) !== String(postId)));
      showToast("Post removed.", "success");
      addActivity({ type: "mod_delete_post", postId, userId: profile.id });
    } catch (e) {
      showToast(e?.message || "Couldn’t delete post.", "error");
    }
  };
  const pinPost = async (postId) => {
    const row = posts.find((p) => String(p.id) === String(postId));
    const nextPinned = !row?.pinned;
    try {
      await api.adminPatchPostModeration(postId, { pinned: nextPinned });
      setPosts((ps) => ps.map((p) => (String(p.id) === String(postId) ? { ...p, pinned: nextPinned } : p)));
      showToast(nextPinned ? "Post pinned." : "Pin removed.", "success");
    } catch (e) {
      showToast(e?.message || "Couldn’t update pin.", "error");
    }
  };
  const banUser = async (userId, reasonText = "") => {
    try {
      await api.adminPatchUser(userId, { banned: true, bannedReason: reasonText || "Forum moderation" });
      showToast("User banned.", "success");
      addActivity({ type: "mod_ban", userId });
    } catch (e) {
      showToast(e?.message || "Couldn’t ban user.", "error");
    }
  };
  const unbanUser = async (userId) => {
    try {
      await api.adminPatchUser(userId, { banned: false });
      showToast("Ban lifted.", "success");
      addActivity({ type: "mod_unban", userId });
    } catch (e) {
      showToast(e?.message || "Couldn’t lift ban.", "error");
    }
  };

  const runFriendMutation = async (body, activityPayload) => {
    try {
      const out = await api.friendAction(body);
      if (!out?.ok) {
        showToast(String(out?.error || "Couldn’t update friends."), "error");
        return false;
      }
      const { ok: _omit, ...wire } = out;
      hydrateAccountFromServer(wire);
      if (activityPayload) addActivity(activityPayload);
      return true;
    } catch (e) {
      showToast(e?.message || "Couldn’t update friends.", "error");
      return false;
    }
  };

  const sharePost = async (postId) => {
    const id = encodeURIComponent(String(postId || "").trim());
    const url = typeof window !== "undefined" && id ? `${window.location.origin}/p/${id}` : "";
    try {
      if (url) await navigator.clipboard.writeText(url);
      else throw new Error("missing_url");
    } catch {
      if (url && typeof window !== "undefined" && window.prompt) {
        window.prompt("Copy link to this post:", url);
      } else {
        showToast("Couldn’t copy link to clipboard.", "error");
      }
    }
    addActivity({ type: "share", postId, userId: profile.id });
  };

  const shareComment = async (postId, commentId) => {
    const p = encodeURIComponent(String(postId || "").trim());
    const c = encodeURIComponent(String(commentId || "").trim());
    const url = typeof window !== "undefined" && p && c ? `${window.location.origin}/p/${p}#c-${c}` : "";
    try {
      if (url) await navigator.clipboard.writeText(url);
      else throw new Error("missing_url");
    } catch {
      if (url && typeof window !== "undefined" && window.prompt) {
        window.prompt("Copy link to this comment:", url);
      } else {
        showToast("Couldn’t copy link to clipboard.", "error");
      }
    }
    addActivity({ type: "share_comment", postId: String(postId), commentId: String(commentId), userId: profile.id });
  };

  const updateComment = useCallback(
    async (postId, commentId, text) => {
      const key = String(postId);
      const idStr = String(commentId);
      try {
        const out = await api.patchComment(postId, commentId, text);
        if (out?.comment) {
          setCommentsByPostId((m) => {
            const prev = m[key] || [];
            return {
              ...m,
              [key]: prev.map((row) => (String(row.id) === idStr ? { ...row, ...out.comment } : row)),
            };
          });
        }
        showToast("Comment updated.", "success");
        return true;
      } catch (e) {
        showToast(e?.message || "Couldn’t save comment.", "error");
        return false;
      }
    },
    [setCommentsByPostId]
  );

  const removeComment = useCallback(
    async (postId, commentId) => {
      const key = String(postId);
      const idStr = String(commentId);
      try {
        const out = await api.deleteComment(postId, commentId);
        if (out?.post) upsertFeedPost(out.post);
        setCommentsByPostId((m) => {
          const prev = m[key] || [];
          return { ...m, [key]: prev.filter((row) => String(row.id) !== idStr) };
        });
        showToast("Comment removed.", "success");
        return true;
      } catch (e) {
        showToast(e?.message || "Couldn’t delete comment.", "error");
        return false;
      }
    },
    [upsertFeedPost, setCommentsByPostId]
  );

  // -------- Friends --------
  const acceptFriend = async (id) => {
    await runFriendMutation({ action: "accept", fromUserId: String(id) }, { type: "friend_accept", userId: id });
  };
  const declineFriend = async (id) => {
    await runFriendMutation({ action: "decline", fromUserId: String(id) }, { type: "friend_decline", userId: id });
  };
  const removeFriend = async (id) => {
    await runFriendMutation({ action: "remove", userId: String(id) }, { type: "friend_remove", userId: id });
  };
  const cancelOutgoing = async (id) => {
    await runFriendMutation({ action: "cancel", toUserId: String(id) }, null);
  };
  const sendFriendRequest = async (id) => {
    await runFriendMutation({ action: "request", toUserId: String(id) }, { type: "friend_request", userId: id });
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

  const value = {
      page,
      setPage,
      profileVisitUserId,
      fetchAndMergeVisitByHandle,
      setProfileVisitUserId,
      profileNotFoundHandle,
      setProfileNotFoundHandle,
      profileRouteLoading,
      profileRouteError,
      setProfileRouteError,
      setResolvedProfileHandle,
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
      updateComment,
      removeComment,
      updatePost,
      toggleBookmark,
      likePost,
      refreshFeed,
      reloadForumFeed,
      loadMoreFeedPosts,
      feedNextCursor,
      publishPost,
      loadCommentsFromServer,
      reportPost,
      sharePost,
      shareComment,
      activePostId,
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
      authReady,
      accountReady,
      role,
      accountEmail,
      isStaff: role === "admin" || role === "moderator",
      usernameCooldownUntil,
      signIn,
      signOut,
      hydrateAccountFromServer,
      persistFullProfile,
      badgeColors,
      tagColors,
      applyLandingExtras,
      onlineByUserId,
      openForumSearchWith,
      peekForumSearchSeed,
      clearForumSearchSeed,
      // moderation (staff API)
      deletePost,
      pinPost,
      banUser,
      unbanUser,
  };
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const v = useContext(AppStateContext);
  if (!v) throw new Error("useAppState must be used within AppStateProvider");
  return v;
}

