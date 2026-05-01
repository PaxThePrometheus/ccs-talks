"use client";

import { CCS_OLFU_UNIVERSITY } from "@/lib/ccs/profileOptions";
import { useEffect, useMemo, useState } from "react";
import * as api from "../api/ccsApi";

function selectStyle() {
  return {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "#fff",
    padding: "10px 12px",
    outline: "none",
    fontSize: 13,
  };
}

export function ProfileEditModal({ open, profile, usernameCooldownUntil = null, onCancel, onSave }) {
  const [draft, setDraft] = useState(profile);
  /** @type {{ programs: string[], campuses: string[], years: string[], focuses: string[], orgs: string[] } | null} */
  const [fieldOptions, setFieldOptions] = useState(null);

  useEffect(() => {
    if (open) setDraft(profile);
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    void api
      .getProfileFieldOptions()
      .then((d) => {
        if (!cancel && d?.options && typeof d.options === "object") setFieldOptions(d.options);
      })
      .catch(() => {
        if (!cancel) setFieldOptions(null);
      });
    return () => {
      cancel = true;
    };
  }, [open]);

  const cooldownActive = typeof usernameCooldownUntil === "number" && Date.now() < usernameCooldownUntil;

  const fieldsLeft = useMemo(() => [["name", "Name"]], []);
  const fieldsRightTop = useMemo(() => [["college", "College"]], []);

  const selectFields = useMemo(
    () => [
      ["program", "Program / course", "programs"],
      ["campus", "Campus", "campuses"],
      ["year", "Year", "years"],
      ["focus", "Focus", "focuses"],
      ["org", "Org", "orgs"],
    ],
    []
  );

  if (!open) return null;

  const onChange = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  function renderSelect(field, label, optKey) {
    const opts = fieldOptions?.[optKey];
    const list = Array.isArray(opts) && opts.length ? opts : [];

    return (
      <div key={field}>
        <div style={{ fontSize: 12, color: "rgba(240,220,220,0.70)", marginBottom: 6 }}>{label}</div>
        <select value={draft?.[field] ?? ""} onChange={(e) => onChange(field, e.target.value)} style={selectStyle()}>
          <option value="">—</option>
          {draft?.[field] && !list.includes(String(draft[field]).trim()) ? (
            <option value={draft[field]}>{draft[field]} (saved)</option>
          ) : null}
          {list.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={onCancel}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
        }}
      />

      <div
        className="ccs-scroll"
        style={{
          position: "relative",
          width: "min(820px, 96vw)",
          maxHeight: "min(86vh, 820px)",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(20,0,8,0.72)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>Edit profile</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onCancel} style={btnStyle("ghost")}>
              Cancel
            </button>
            <button type="button" onClick={() => onSave?.(draft)} style={btnStyle("solid")}>
              Save
            </button>
          </div>
        </div>

        <div className="ccs-stack-mobile" style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {fieldsLeft.map(([k, label]) => (
            <div key={k}>
              <div style={{ fontSize: 12, color: "rgba(240,220,220,0.70)", marginBottom: 6 }}>{label}</div>
              <input value={draft?.[k] ?? ""} onChange={(e) => onChange(k, e.target.value)} style={inputStyle(false)} />
            </div>
          ))}

          <div>
            <div style={{ fontSize: 12, color: "rgba(240,220,220,0.70)", marginBottom: 6 }}>Username</div>
            <input
              value={draft?.handle ?? ""}
              disabled={cooldownActive}
              onChange={(e) => onChange("handle", e.target.value)}
              style={{ ...inputStyle(false), opacity: cooldownActive ? 0.55 : 1 }}
            />
            {cooldownActive && (
              <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,180,190,0.85)" }}>
                Username can be changed again after {new Date(usernameCooldownUntil).toLocaleString()}.
              </div>
            )}
          </div>

          <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(240,220,220,0.70)", marginBottom: 6 }}>Status</div>
              <div style={{ ...inputStyle(false), opacity: 0.75 }}>{draft?.status || "—"}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: "rgba(240,220,220,0.50)" }}>Assigned by moderators; contact staff to update.</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "rgba(240,220,220,0.70)", marginBottom: 6 }}>University</div>
              <div style={{ ...inputStyle(false), opacity: 0.75 }}>{CCS_OLFU_UNIVERSITY}</div>
            </div>
          </div>

          {selectFields.map(([field, label, optKey]) => (
            <div key={field}>{renderSelect(field, label, optKey)}</div>
          ))}

          {fieldsRightTop.map(([k, label]) => (
            <div key={k} style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: "rgba(240,220,220,0.70)", marginBottom: 6 }}>{label}</div>
              <input value={draft?.[k] ?? ""} onChange={(e) => onChange(k, e.target.value)} style={inputStyle(false)} />
            </div>
          ))}

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "rgba(240,220,220,0.70)", marginBottom: 6 }}>Bio</div>
            <textarea value={draft?.bio ?? ""} onChange={(e) => onChange("bio", e.target.value)} rows={4} style={inputStyle(true)} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "rgba(240,220,220,0.70)", marginBottom: 6 }}>Forum signature (text)</div>
            <textarea value={draft?.signature ?? ""} onChange={(e) => onChange("signature", e.target.value)} rows={3} maxLength={280} style={inputStyle(true)} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "rgba(240,220,220,0.70)", marginBottom: 6 }}>Signature banner image (https URL or data URL)</div>
            <input value={draft?.signatureImage ?? ""} onChange={(e) => onChange("signatureImage", e.target.value)} style={inputStyle(false)} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "rgba(240,220,220,0.70)", marginBottom: 6 }}>Signature link (https only)</div>
            <input value={draft?.signatureLink ?? ""} onChange={(e) => onChange("signatureLink", e.target.value)} style={inputStyle(false)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function btnStyle(kind) {
  if (kind === "solid") {
    return {
      border: "1px solid rgba(255,255,255,0.14)",
      background: "linear-gradient(135deg, rgba(255,96,128,0.28), rgba(155,0,40,0.55))",
      color: "#fff",
      padding: "9px 12px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 850,
      fontSize: 13,
    };
  }
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.88)",
    padding: "9px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 750,
    fontSize: 13,
  };
}

function inputStyle(isTextarea) {
  return {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "#fff",
    padding: isTextarea ? "10px 12px" : "10px 12px",
    outline: "none",
    fontSize: 13,
    lineHeight: 1.4,
    resize: isTextarea ? "vertical" : "none",
  };
}
