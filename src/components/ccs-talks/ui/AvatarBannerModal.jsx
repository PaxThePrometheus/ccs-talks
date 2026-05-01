"use client";

import { prepareProfileImageFileForUpload } from "@/lib/ccs/imageCompressClient";
import { useEffect, useRef, useState } from "react";
import { ImageCropModal } from "./ImageCropModal";

const COLOR_PRESETS = [
  ["#9b0028", "#ff6080"],
  ["#3a0014", "#ff3a6e"],
  ["#1f3a5f", "#7ab6ff"],
  ["#1f5f3a", "#7affb6"],
  ["#5f3a1f", "#ffb67a"],
  ["#3f1f5f", "#b67aff"],
  ["#0a0a0a", "#cccccc"],
  ["#fff5f7", "#ff6080"],
];

export function AvatarBannerModal({ open, profile, onCancel, onSave }) {
  const [draft, setDraft] = useState(profile);
  const [cropTarget, setCropTarget] = useState(null);
  const avFile = useRef(null);
  const bnFile = useRef(null);

  useEffect(() => {
    if (open) setDraft(profile);
  }, [open, profile]);

  useEffect(() => {
    if (!open) setCropTarget(null);
  }, [open]);

  if (!open) return null;

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  async function enqueueCropFromFile(variant, file) {
    if (!file) return;
    const label = variant === "banner" ? "Banner image" : "Avatar image";
    try {
      const url = await prepareProfileImageFileForUpload(file, { contextLabel: label });
      if (!url) return;
      setCropTarget({ variant, src: url });
    } catch (e) {
      console.warn("[ccs] avatar/banner upload", e);
    }
  }

  function canCropUrl(src) {
    return !!src && (src.startsWith("data:image") || /^https?:\/\//i.test(src));
  }

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 520, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }} />

      <div
        className="ccs-scroll"
        style={{
          position: "relative",
          width: "min(900px, 96vw)",
          maxHeight: "min(86vh, 820px)",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(20,0,8,0.78)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
          color: "#fff",
        }}
      >
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 900, letterSpacing: "-0.3px" }}>Edit avatar & banner</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} style={btn("ghost")}>Cancel</button>
            <button onClick={() => onSave?.(draft)} style={btn("solid")}>Save</button>
          </div>
        </div>

        <div className="ccs-stack-mobile" style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <Preview profile={draft} />
          </div>

          <Card title="Avatar">
            <Subtitle>Image</Subtitle>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="file"
                ref={avFile}
                accept="image/*"
                onChange={(e) => {
                  void enqueueCropFromFile("avatar", e.target.files?.[0]).finally(() => {
                    e.target.value = "";
                  });
                }}
                style={{ display: "none" }}
              />
              <button type="button" onClick={() => avFile.current?.click()} style={btn("ghost")}>
                Upload…
              </button>
              <input
                placeholder="Paste image URL"
                value={draft.avatarImage || ""}
                onChange={(e) => set("avatarImage", e.target.value)}
                style={inp(220)}
              />
              {draft.avatarImage ? (
                <>
                  {canCropUrl(draft.avatarImage) ? (
                    <button type="button" onClick={() => setCropTarget({ variant: "avatar", src: draft.avatarImage })} style={btn("ghost")}>
                      Crop &amp; zoom…
                    </button>
                  ) : null}
                  <button type="button" onClick={() => set("avatarImage", "")} style={btn("ghost")}>
                    Remove
                  </button>
                </>
              ) : null}
            </div>

            <Subtitle>Or use a color gradient</Subtitle>
            <Row>
              <Field label="Base"><input type="color" value={draft.avatarColor} onChange={(e) => set("avatarColor", e.target.value)} style={swatch()} /></Field>
              <Field label="Accent"><input type="color" value={draft.avatarAccent} onChange={(e) => set("avatarAccent", e.target.value)} style={swatch()} /></Field>
            </Row>
            <Presets onPick={([c1, c2]) => setDraft((d) => ({ ...d, avatarColor: c1, avatarAccent: c2, avatarImage: "" }))} />
          </Card>

          <Card title="Banner">
            <Subtitle>Image</Subtitle>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="file"
                ref={bnFile}
                accept="image/*"
                onChange={(e) => {
                  void enqueueCropFromFile("banner", e.target.files?.[0]).finally(() => {
                    e.target.value = "";
                  });
                }}
                style={{ display: "none" }}
              />
              <button type="button" onClick={() => bnFile.current?.click()} style={btn("ghost")}>
                Upload…
              </button>
              <input
                placeholder="Paste image URL"
                value={draft.bannerImage || ""}
                onChange={(e) => set("bannerImage", e.target.value)}
                style={inp(220)}
              />
              {draft.bannerImage ? (
                <>
                  {canCropUrl(draft.bannerImage) ? (
                    <button type="button" onClick={() => setCropTarget({ variant: "banner", src: draft.bannerImage })} style={btn("ghost")}>
                      Crop &amp; zoom…
                    </button>
                  ) : null}
                  <button type="button" onClick={() => set("bannerImage", "")} style={btn("ghost")}>
                    Remove
                  </button>
                </>
              ) : null}
            </div>

            <Subtitle>Or use a color gradient</Subtitle>
            <Row>
              <Field label="Base"><input type="color" value={draft.bannerColor} onChange={(e) => set("bannerColor", e.target.value)} style={swatch()} /></Field>
              <Field label="Accent"><input type="color" value={draft.bannerAccent} onChange={(e) => set("bannerAccent", e.target.value)} style={swatch()} /></Field>
            </Row>
            <Presets onPick={([c1, c2]) => setDraft((d) => ({ ...d, bannerColor: c1, bannerAccent: c2, bannerImage: "" }))} />
          </Card>
        </div>
      </div>

      <ImageCropModal
        open={!!cropTarget}
        variant={cropTarget?.variant || "avatar"}
        imageSrc={cropTarget?.src || ""}
        title={cropTarget?.variant === "banner" ? "Crop banner" : "Crop avatar"}
        onCancel={() => setCropTarget(null)}
        onComplete={(dataUrl) => {
          if (!cropTarget) return;
          const key = cropTarget.variant === "banner" ? "bannerImage" : "avatarImage";
          set(key, dataUrl);
          setCropTarget(null);
        }}
      />
    </div>
  );
}

function Preview({ profile }) {
  const bannerStyle = profile.bannerImage
    ? { backgroundImage: `url(${profile.bannerImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {
        background: `radial-gradient(700px 280px at 70% 20%, ${withAlpha(profile.bannerAccent, 0.30)}, transparent 62%),
                     radial-gradient(500px 240px at 20% 70%, ${withAlpha(profile.bannerAccent, 0.22)}, transparent 60%),
                     linear-gradient(180deg, ${profile.bannerColor}00 0%, ${profile.bannerColor}D9 100%),
                     ${profile.bannerColor}`,
      };

  const avStyle = profile.avatarImage
    ? { backgroundImage: `url(${profile.avatarImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(135deg, ${profile.avatarAccent}, ${profile.avatarColor})` };

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
      <div style={{ height: 160, ...bannerStyle }} />
      <div style={{ position: "absolute", left: 14, bottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.20)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.40)",
            ...avStyle,
          }}
        />
        <div>
          <div style={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.2px" }}>{profile.name}</div>
          <div style={{ color: "rgba(240,220,220,0.62)", fontSize: 12 }}>@{profile.handle}</div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(30,0,12,0.55)", padding: 14 }}>
      <div style={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.2px" }}>{title}</div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function Subtitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(240,220,220,0.55)", letterSpacing: "0.18em", textTransform: "uppercase", margin: "10px 0 6px" }}>{children}</div>;
}

function Row({ children }) { return <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>{children}</div>; }
function Field({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ color: "rgba(240,220,220,0.7)", fontSize: 12, fontWeight: 700 }}>{label}</div>
      {children}
    </div>
  );
}

function Presets({ onPick }) {
  return (
    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {COLOR_PRESETS.map(([a, b], i) => (
        <button key={i} onClick={() => onPick([a, b])} title={`${a} / ${b}`}
          style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", cursor: "pointer", background: `linear-gradient(135deg, ${b}, ${a})`, padding: 0 }}
        />
      ))}
    </div>
  );
}

function swatch() { return { width: 38, height: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)", background: "transparent", cursor: "pointer", padding: 0 }; }
function inp(w) {
  return {
    width: w || 220,
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "#fff",
    padding: "8px 10px",
    outline: "none",
    fontSize: 12,
  };
}
function btn(kind) {
  if (kind === "solid") {
    return { border: "1px solid rgba(255,255,255,0.14)", background: "linear-gradient(135deg, rgba(255,96,128,0.28), rgba(155,0,40,0.55))", color: "#fff", padding: "9px 12px", borderRadius: 12, cursor: "pointer", fontWeight: 850, fontSize: 13 };
  }
  return { border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.88)", padding: "9px 12px", borderRadius: 12, cursor: "pointer", fontWeight: 750, fontSize: 13 };
}

function withAlpha(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${a})`;
}
