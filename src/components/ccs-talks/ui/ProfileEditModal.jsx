"use client";

import { useEffect, useMemo, useState } from "react";

export function ProfileEditModal({ open, profile, onCancel, onSave }) {
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    if (open) setDraft(profile);
  }, [open, profile]);

  const fields = useMemo(
    () => [
      ["name", "Name"],
      ["handle", "Handle"],
      ["status", "Status"],
      ["university", "University"],
      ["college", "College"],
      ["program", "Program / Course"],
      ["year", "Year"],
      ["campus", "Campus"],
      ["focus", "Focus"],
      ["org", "Org"],
      ["bio", "Bio"],
      ["badges", "Badges (comma separated)"],
    ],
    []
  );

  if (!open) return null;

  const onChange = (k, v) => {
    if (k === "badges") {
      setDraft((d) => ({ ...d, badges: v.split(",").map((x) => x.trim()).filter(Boolean) }));
    } else {
      setDraft((d) => ({ ...d, [k]: v }));
    }
  };

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
            <button onClick={onCancel} style={btnStyle("ghost")}>
              Cancel
            </button>
            <button onClick={() => onSave?.(draft)} style={btnStyle("solid")}>
              Save
            </button>
          </div>
        </div>

        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {fields.map(([k, label]) => (
            <div key={k} style={{ gridColumn: k === "bio" ? "1 / -1" : "auto" }}>
              <div style={{ fontSize: 12, color: "rgba(240,220,220,0.70)", marginBottom: 6 }}>{label}</div>
              {k === "bio" ? (
                <textarea
                  value={draft?.bio ?? ""}
                  onChange={(e) => onChange("bio", e.target.value)}
                  rows={4}
                  style={inputStyle(true)}
                />
              ) : (
                <input
                  value={k === "badges" ? (draft?.badges || []).join(", ") : draft?.[k] ?? ""}
                  onChange={(e) => onChange(k, e.target.value)}
                  style={inputStyle(false)}
                />
              )}
            </div>
          ))}
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

