"use client";
import { useRef, useState } from "react";
import { canManageUser } from "@/lib/ccs/staffPolicy.mjs";
import { jsonFetch } from "./adminFetch";
import { useAdminDraft } from "./useAdminDraft";

const fields = [
  "name",
  "handle",
  "bio",
  "status",
  "college",
  "program",
  "campus",
  "year",
  "focus",
  "org",
  "signature",
  "signatureLink",
  "signatureImage",
  "avatarImage",
  "bannerImage",
  "avatarColor",
  "avatarAccent",
  "bannerColor",
  "bannerAccent",
];
const pick = (profile) =>
  Object.fromEntries(fields.map((key) => [key, String(profile?.[key] || "")]));
const label = (key) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
export function UserEditor({ viewer, selectedUser: initial, onError }) {
  const [saved, setSaved] = useState(initial);
  const [profile, setProfile] = useState(() => pick(initial.profile));
  const [badges, setBadges] = useState(
    (initial.profile?.badges || []).join("\n"),
  );
  const [faculty, setFaculty] = useState(
    initial.profile?.publicRoleBadge || "",
  );
  const [role, setRole] = useState(initial.role);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const profileDirty =
    JSON.stringify(profile) !== JSON.stringify(pick(saved.profile)) ||
    badges !== (saved.profile?.badges || []).join("\n") ||
    faculty !== (saved.profile?.publicRoleBadge || "");
  const dirty = profileDirty || role !== saved.role;
  useAdminDraft(dirty);
  function accept(user) {
    setSaved(user);
    setProfile(pick(user.profile));
    setBadges((user.profile?.badges || []).join("\n"));
    setFaculty(user.profile?.publicRoleBadge || "");
    setRole(user.role);
  }
  async function mutate(patch) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const out = await jsonFetch(
        `/api/admin/users/${encodeURIComponent(saved.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ ...patch, expectedVersion: saved.version }),
        },
      );
      accept(out.user);
      setMessage("Account saved.");
    } catch (error) {
      onError(error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    if (dirty && !window.confirm("Reload this account and discard your draft?"))
      return;
    try {
      const out = await jsonFetch(
        `/api/admin/users/${encodeURIComponent(saved.id)}`,
      );
      accept(out.user);
      setMessage("Loaded the latest account.");
    } catch (error) {
      onError(error);
    }
  }
  async function remove() {
    if (
      lock.current ||
      !window.confirm(
        "Permanently delete this account, their posts and comments? Report evidence and audit history are retained.",
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    try {
      await jsonFetch(`/api/admin/users/${encodeURIComponent(saved.id)}`, {
        method: "DELETE",
      });
      setMessage("Account deleted.");
    } catch (error) {
      onError(error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const canEdit = canManageUser(viewer, saved, "profile");
  return (
    <div className="admin-editor">
      <dl className="inspector-metadata">
        <div>
          <dt>Account ID</dt>
          <dd>{saved.id}</dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>
            {saved.createdAt
              ? new Date(saved.createdAt).toLocaleDateString()
              : "Date unavailable"}
          </dd>
        </div>
        <div>
          <dt>Access</dt>
          <dd>{saved.banned ? "Banned" : "Active"}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{saved.role}</dd>
        </div>
      </dl>
      <section className="admin-editor" aria-label="Member profile">
        {fields.slice(0, 4).map((key) => (
          <label className="admin-field" key={key}>
            {label(key)}
            <textarea
              aria-label={label(key)}
              rows={key === "bio" ? 4 : 1}
              maxLength={key === "bio" ? 280 : key === "handle" ? 32 : 80}
              value={profile[key]}
              disabled={!canEdit || busy}
              onChange={(event) =>
                setProfile((previous) => ({
                  ...previous,
                  [key]: event.target.value,
                }))
              }
            />
          </label>
        ))}
        <details>
          <summary className="admin-editor-summary">
            Education, signature and profile appearance
          </summary>
          <div className="admin-editor">
            {fields.slice(4).map((key) => (
              <label className="admin-field" key={key}>
                {label(key)}
                <input
                  value={profile[key]}
                  disabled={!canEdit || busy}
                  onChange={(event) =>
                    setProfile((previous) => ({
                      ...previous,
                      [key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </details>
        <label className="admin-field">
          Badges, one per line
          <textarea
            aria-label="Badges, one per line"
            rows={3}
            value={badges}
            disabled={!canEdit || busy}
            onChange={(event) => setBadges(event.target.value)}
          />
          <span className="inspector-caption">
            Up to 8 badges, 64 characters each.
          </span>
        </label>
        <label className="admin-field">
          Public faculty title
          <select
            aria-label="Public faculty title"
            value={faculty}
            disabled={!canEdit || busy}
            onChange={(event) => setFaculty(event.target.value)}
          >
            <option value="">No faculty title</option>
            {["teacher", "instructor", "dean", "professor"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </section>
      <div className="inspector-actions">
        <button
          className="inspector-button primary"
          disabled={!canEdit || busy || !profileDirty}
          onClick={() =>
            mutate({
              profile: {
                ...profile,
                badges: badges
                  .split("\n")
                  .map((value) => value.trim())
                  .filter(Boolean),
                publicRoleBadge: faculty || null,
              },
            })
          }
        >
          {busy ? "Saving…" : "Save profile"}
        </button>
        <button
          className="inspector-button"
          disabled={busy || !dirty}
          onClick={() => {
            if (window.confirm("Discard profile changes?")) accept(saved);
          }}
        >
          Discard changes
        </button>
        <button
          className="inspector-button quiet"
          disabled={busy}
          onClick={reload}
        >
          Reload account
        </button>
      </div>
      {canManageUser(viewer, saved, "role") && (
        <section className="admin-editor">
          <h2 style={{ fontSize: 18 }}>Staff access</h2>
          <label className="admin-field">
            Account role
            <select
              aria-label="Account role"
              value={role}
              disabled={busy}
              onChange={(event) => setRole(event.target.value)}
            >
              {["student", "moderator", "admin"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <button
            className="inspector-button"
            disabled={busy || profileDirty || role === saved.role}
            onClick={() => {
              if (
                window.confirm(
                  "Apply this role change? All sessions for this account will be revoked.",
                )
              )
                mutate({ role });
            }}
          >
            Apply role change
          </button>
        </section>
      )}
      {canManageUser(viewer, saved, "ban") && (
        <section className="admin-editor">
          <h2 style={{ fontSize: 18 }}>Account restrictions</h2>
          <p className="inspector-caption">
            {saved.bannedReason || "No active ban reason."}
          </p>
          <label className="admin-field">
            Ban reason
            <input
              value={reason}
              maxLength={240}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button
            className="inspector-button"
            disabled={busy || profileDirty || (!saved.banned && !reason.trim())}
            onClick={() => {
              if (
                window.confirm(
                  saved.banned
                    ? "Restore access for this account?"
                    : "Ban this account and revoke its sessions?",
                )
              )
                mutate({ banned: !saved.banned, bannedReason: reason });
            }}
          >
            {saved.banned ? "Unban account" : "Ban account"}
          </button>
        </section>
      )}
      {canManageUser(viewer, saved, "delete") && saved.id !== viewer.id && (
        <button className="inspector-button" disabled={busy} onClick={remove}>
          Delete account
        </button>
      )}
      <a
        className="inspector-button quiet"
        href={`/admin?section=audit&q=${encodeURIComponent(saved.id)}`}
      >
        View account audit history
      </a>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
