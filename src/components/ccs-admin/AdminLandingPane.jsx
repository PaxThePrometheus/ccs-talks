"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { defaultLandingCms } from "@/lib/ccs/landingDefaults";
import { useAdminDraft } from "./useAdminDraft";
import { jsonFetch } from "./adminFetch";
const label = (value) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());

function CmsField({ name, value, template, onChange, disabled }) {
  if (typeof template === "string")
    return (
      <label className="admin-field">
        {label(name)}
        <textarea
          aria-label={label(name)}
          rows={value?.length > 100 ? 3 : 1}
          maxLength={4096}
          disabled={disabled}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  if (typeof template === "number")
    return (
      <label className="admin-field">
        {label(name)}
        <input
          type="number"
          disabled={disabled}
          value={value ?? 0}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
    );
  if (Array.isArray(template))
    return (
      <fieldset className="admin-cms-group">
        <legend>{label(name)}</legend>
        <div className="admin-cms-array">
          {(value || []).map((item, index) => (
            <article key={index}>
              <CmsField
                name={`${label(name)} ${index + 1}`}
                value={item}
                template={template[0] ?? ""}
                disabled={disabled}
                onChange={(next) =>
                  onChange(value.map((prev, i) => (i === index ? next : prev)))
                }
              />
              <button
                className="inspector-button quiet"
                disabled={disabled}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                Remove item {index + 1}
              </button>
            </article>
          ))}
        </div>
        <button
          className="inspector-button"
          disabled={disabled || (value?.length || 0) >= 64}
          onClick={() =>
            onChange([...(value || []), structuredClone(template[0] ?? "")])
          }
        >
          Add {label(name).toLowerCase()} item
        </button>
      </fieldset>
    );
  return (
    <fieldset className="admin-cms-group">
      <legend>{label(name)}</legend>
      {Object.entries(template).map(([key, example]) => (
        <CmsField
          key={key}
          name={key}
          value={value?.[key] ?? example}
          template={example}
          disabled={disabled}
          onChange={(next) => onChange({ ...value, [key]: next })}
        />
      ))}
    </fieldset>
  );
}
export function AdminLandingPane({ onError }) {
  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [version, setVersion] = useState(0);
  const [revisions, setRevisions] = useState([]);
  const [mode, setMode] = useState("fields");
  const [json, setJson] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const load = useCallback(async (signal) => {
    const bundle = await jsonFetch("/api/admin/landing", { signal });
    if (signal?.aborted) return;
    setDraft(bundle.cms);
    setBaseline(bundle.cms);
    setJson(JSON.stringify(bundle.cms, null, 2));
    setVersion(bundle.version || 0);
    setRevisions(bundle.revisions || []);
    setError("");
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        load(controller.signal).catch((error) => {
          if (!controller.signal.aborted) {
            setError(error.message);
            onError(error);
          }
        }),
      0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, onError]);
  const dirty =
    draft &&
    (mode === "json"
      ? json !== JSON.stringify(baseline, null, 2)
      : JSON.stringify(draft) !== JSON.stringify(baseline));
  useAdminDraft(dirty);
  async function publish(restoreRevisionId = null) {
    if (lock.current) return;
    if (
      restoreRevisionId &&
      !window.confirm(
        "Restore this revision? The current publication will be retained in history. Unsaved edits will be discarded.",
      )
    )
      return;
    let cms = draft;
    if (!restoreRevisionId && mode === "json")
      try {
        cms = JSON.parse(json);
      } catch {
        setError("Invalid JSON. Your draft is preserved.");
        return;
      }
    lock.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const bundle = await jsonFetch("/api/admin/landing", {
        method: "PATCH",
        body: JSON.stringify(
          restoreRevisionId
            ? { restoreRevisionId, expectedVersion: version }
            : { cms, expectedVersion: version },
        ),
      });
      setDraft(bundle.cms);
      setBaseline(bundle.cms);
      setJson(JSON.stringify(bundle.cms, null, 2));
      setVersion(bundle.version);
      setRevisions(bundle.revisions || []);
      setMessage(
        restoreRevisionId ? "Revision restored." : "Landing page published.",
      );
    } catch (error) {
      setError(error.message);
      onError(error);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  function switchMode(next) {
    if (mode === "json")
      try {
        setDraft(JSON.parse(json));
      } catch {
        setError("Fix the JSON before leaving the advanced editor.");
        return;
      }
    else setJson(JSON.stringify(draft, null, 2));
    setMode(next);
    setError("");
  }
  if (!draft)
    return (
      <div className="inspector-message" role={error ? "alert" : "status"}>
        {error || "Loading landing content…"}
        {error && (
          <button
            className="inspector-button"
            onClick={() => load().catch(onError)}
          >
            Retry
          </button>
        )}
      </div>
    );
  const template = defaultLandingCms();
  return (
    <div className="admin-editor">
      <div
        className="inspector-toolbar-tools"
        role="group"
        aria-label="CMS editor view"
      >
        {[
          ["fields", "Edit fields"],
          ["preview", "Preview draft"],
          ["json", "Advanced JSON"],
        ].map(([key, text]) => (
          <button
            key={key}
            className="inspector-button"
            aria-pressed={mode === key}
            disabled={pending}
            onClick={() => switchMode(key)}
          >
            {text}
          </button>
        ))}
      </div>
      <p className="inspector-caption">
        Edits stay in this draft until you publish. Existing publications are
        retained for rollback. Community counters remain live.
      </p>
      {error && (
        <p className="inspector-alert" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {mode === "fields" ? (
        <>
          {Object.entries(template).map(([key, example]) => (
            <details key={key} className="admin-cms-section">
              <summary>{label(key)}</summary>
              <CmsField
                name={key}
                value={draft[key]}
                template={example}
                disabled={pending}
                onChange={(value) =>
                  setDraft((previous) => ({ ...previous, [key]: value }))
                }
              />
            </details>
          ))}
        </>
      ) : mode === "json" ? (
        <label className="admin-field">
          Advanced CMS JSON
          <textarea
            aria-label="Advanced CMS JSON"
            rows={22}
            spellCheck={false}
            disabled={pending}
            value={json}
            onChange={(event) => setJson(event.target.value)}
          />
        </label>
      ) : (
        <section
          className="inspector-preview admin-cms-preview"
          aria-label="Landing draft preview"
        >
          <p className="inspector-eyebrow">DRAFT PREVIEW</p>
          <p>{draft.heroEyebrow}</p>
          <h1>{draft.brandName}</h1>
          <p>{draft.heroSubtitle}</p>
          <div>
            {draft.featureCards?.map((item, index) => (
              <article key={index}>
                <h3>{item.t || item.title}</h3>
                <p>{item.b || item.body}</p>
              </article>
            ))}
          </div>
          <h2>{draft.communityTitle}</h2>
          {draft.communityOrgs?.map((item, index) => (
            <p key={index}>
              {item.name || item.title} · {item.desc || item.description}
            </p>
          ))}
          <h2>{draft.bottomCta?.title}</h2>
          <p>{draft.bottomCta?.subtitle}</p>
          <p className="inspector-caption">
            Content preview. Public page styling and live counters remain on the
            website.
          </p>
        </section>
      )}
      <div className="inspector-actions">
        <button
          className="inspector-button primary"
          disabled={pending || !dirty}
          onClick={() => publish()}
        >
          {pending ? "Publishing…" : "Publish changes"}
        </button>
        <button
          className="inspector-button"
          disabled={pending || !dirty}
          onClick={() => {
            if (window.confirm("Discard draft changes?")) {
              setDraft(baseline);
              setJson(JSON.stringify(baseline, null, 2));
            }
          }}
        >
          Discard changes
        </button>
        <button
          className="inspector-button quiet"
          disabled={pending}
          onClick={() => {
            if (
              !dirty ||
              window.confirm("Reload published content and discard this draft?")
            )
              load().catch(onError);
          }}
        >
          Reload published
        </button>
        <button
          className="inspector-button quiet"
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                "Replace this draft with defaults? Publishing remains a separate step.",
              )
            ) {
              const defaults = defaultLandingCms();
              setDraft(defaults);
              setJson(JSON.stringify(defaults, null, 2));
            }
          }}
        >
          Load defaults
        </button>
      </div>
      <section className="admin-editor">
        <h2 style={{ fontSize: 18 }}>Publication history</h2>
        {!revisions.length && (
          <p className="inspector-caption">
            Previous publications appear here after the first update.
          </p>
        )}
        {revisions.map((revision) => (
          <div className="inspector-actions" key={revision.id}>
            <span className="inspector-caption">
              {new Date(Number(revision.created_at)).toLocaleString()} ·{" "}
              {revision.actor_id}
            </span>
            <button
              className="inspector-button"
              disabled={pending}
              onClick={() => publish(revision.id)}
            >
              Restore this revision
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
