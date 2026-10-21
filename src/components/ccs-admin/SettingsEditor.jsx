"use client";
import { useEffect, useRef, useState } from "react";
import { BADGE_REGISTRY_MAX } from "@/lib/ccs/badgeColors";
import { jsonFetch } from "./adminFetch";
import { useAdminDraft } from "./useAdminDraft";
const optionLabels = {
  programs: "Programs",
  campuses: "Campuses",
  years: "Year levels",
  focuses: "Areas of focus",
  orgs: "Organizations",
};
export function SettingsEditor({ viewer, onError }) {
  const [baseline, setBaseline] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    jsonFetch("/api/admin/site", { signal: controller.signal })
      .then((out) => {
        if (!controller.signal.aborted) {
          setBaseline(out.settings);
          setDraft(out.settings);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setError(error.message);
          onError(error);
        }
      });
    return () => controller.abort();
  }, [onError]);
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(baseline);
  useAdminDraft(dirty);
  const disabled = viewer.role !== "admin" || busy;
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const patch = {
        registrationOpen: draft.registrationOpen,
        guestReadOnly: draft.guestReadOnly,
        bannedWords: (draft.bannedWords || [])
          .map((value) => value.trim())
          .filter(Boolean),
        profileFieldOptions: Object.fromEntries(
          Object.entries(draft.profileFieldOptions || {}).map(
            ([key, values]) => [
              key,
              values.map((value) => value.trim()).filter(Boolean),
            ],
          ),
        ),
        badgeRegistry: draft.badgeRegistry,
        expectedVersion: baseline.version,
      };
      const out = await jsonFetch("/api/admin/site", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setBaseline(out.settings);
      setDraft(out.settings);
      setMessage("Settings saved.");
    } catch (error) {
      setError(error.message);
      onError(error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    if (dirty && !window.confirm("Discard this draft and reload settings?"))
      return;
    try {
      const out = await jsonFetch("/api/admin/site");
      setBaseline(out.settings);
      setDraft(out.settings);
      setError("");
    } catch (error) {
      setError(error.message);
      onError(error);
    }
  }
  if (!draft)
    return (
      <div role={error ? "alert" : "status"}>
        {error || "Loading settings…"}
        {error && (
          <button className="inspector-button" onClick={reload}>
            Retry settings
          </button>
        )}
      </div>
    );
  return (
    <div className="admin-editor">
      {viewer.role !== "admin" && (
        <p className="inspector-caption">
          Read-only. An administrator can change community settings.
        </p>
      )}
      <section className="admin-editor">
        <h2 style={{ fontSize: 18 }}>Community policies</h2>
        {[
          [
            "registrationOpen",
            "Allow registration",
            "New members can create accounts.",
          ],
          [
            "guestReadOnly",
            "Allow guest browsing",
            "Guests can read posts, comments and public profiles.",
          ],
        ].map(([key, title, hint]) => (
          <label className="admin-policy" key={key}>
            <span>
              <strong>{title}</strong>
              <small>{hint}</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={!!draft[key]}
              disabled={disabled}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  [key]: event.target.checked,
                }))
              }
            />
          </label>
        ))}
        <label className="admin-policy">
          <span>
            <strong>Require email verification</strong>
            <small>
              Unavailable until the email verification workflow is implemented.
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={false}
            disabled
            readOnly
          />
        </label>
        <label className="admin-policy">
          <span>
            <strong>Review link posts automatically</strong>
            <small>
              Unavailable until the link review workflow is implemented.
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={false}
            disabled
            readOnly
          />
        </label>
        <label className="admin-field">
          Banned terms, one per line
          <textarea
            aria-label="Banned terms"
            disabled={disabled}
            value={(draft.bannedWords || []).join("\n")}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                bannedWords: event.target.value.split("\n"),
              }))
            }
            rows={5}
          />
          <span className="inspector-caption">
            Up to 256 terms. Matching ignores case and blocks post/comment
            creation and edits.
          </span>
        </label>
      </section>
      <section className="admin-editor">
        <h2 style={{ fontSize: 18 }}>Badge registry</h2>
        {(draft.badgeRegistry || []).map((badge, index) => (
          <div key={index} className="admin-badge-row">
            <label className="admin-field">
              Badge {index + 1}
              <input
                disabled={disabled}
                maxLength={64}
                value={badge.label}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    badgeRegistry: previous.badgeRegistry.map((row, i) =>
                      i === index ? { ...row, label: event.target.value } : row,
                    ),
                  }))
                }
              />
            </label>
            <label className="admin-field">
              Colour
              <input
                type="color"
                disabled={disabled}
                value={badge.color}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    badgeRegistry: previous.badgeRegistry.map((row, i) =>
                      i === index ? { ...row, color: event.target.value } : row,
                    ),
                  }))
                }
              />
            </label>
            <button
              className="inspector-button"
              disabled={disabled}
              onClick={() =>
                setDraft((previous) => ({
                  ...previous,
                  badgeRegistry: previous.badgeRegistry.filter(
                    (_, i) => i !== index,
                  ),
                }))
              }
            >
              Remove badge {index + 1}
            </button>
          </div>
        ))}
        <button
          className="inspector-button"
          disabled={
            disabled || (draft.badgeRegistry?.length || 0) >= BADGE_REGISTRY_MAX
          }
          onClick={() =>
            setDraft((previous) => ({
              ...previous,
              badgeRegistry: [
                ...(previous.badgeRegistry || []),
                { label: "", color: "#81243f" },
              ],
            }))
          }
        >
          Add badge
        </button>
      </section>
      <details>
        <summary className="admin-editor-summary">
          Profile dropdown options
        </summary>
        <div className="admin-editor">
          {Object.entries(optionLabels).map(([key, title]) => (
            <label className="admin-field" key={key}>
              {title}
              <textarea
                aria-label={title}
                disabled={disabled}
                rows={4}
                value={(draft.profileFieldOptions?.[key] || []).join("\n")}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    profileFieldOptions: {
                      ...previous.profileFieldOptions,
                      [key]: event.target.value.split("\n"),
                    },
                  }))
                }
              />
              <span className="inspector-caption">
                One value per line, up to 96 values.
              </span>
            </label>
          ))}
        </div>
      </details>
      {error && (
        <p role="alert" className="inspector-alert">
          {error} Your draft is preserved; reload to reconcile a conflict.
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <div className="inspector-actions">
        <button
          className="inspector-button primary"
          disabled={disabled || !dirty}
          onClick={save}
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
        <button
          className="inspector-button"
          disabled={busy || !dirty}
          onClick={() => {
            if (window.confirm("Discard settings changes?")) setDraft(baseline);
          }}
        >
          Discard changes
        </button>
        <button
          className="inspector-button quiet"
          disabled={busy}
          onClick={reload}
        >
          Reload settings
        </button>
      </div>
    </div>
  );
}
