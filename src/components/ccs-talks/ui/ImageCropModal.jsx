"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Stay under typical server `clampMediaUrl` caps with margin. */
const DEFAULT_MAX_DATA_URL_CHARS = 340_000;

/**
 * Pan/zoom cropper → JPEG data URL. Covers viewport (no letterboxing empty space).
 *
 * `variant`:
 * - `avatar` — square preview (rounded mask); exports `outputAvatar`² JPEG.
 * - `banner` — wide frame (~2.5:1); exports `outputBannerW × outputBannerH` JPEG.
 */
export function ImageCropModal({
  open,
  variant,
  imageSrc,
  title = "Crop & zoom",
  onCancel,
  onComplete,
  maxDataUrlChars = DEFAULT_MAX_DATA_URL_CHARS,
  outputAvatar = 400,
  outputBannerW = 800,
  outputBannerH = 320,
}) {
  const vw = variant === "avatar" ? 300 : typeof window !== "undefined" ? Math.min(420, Math.floor(window.innerWidth * 0.88)) : 420;
  const vh = variant === "avatar" ? 300 : Math.round(vw / 2.5);

  const viewportRef = useRef(null);
  const liveRef = useRef({ zoomMul: 1, pan: { x: 0, y: 0 }, img: null });
  const [img, setImg] = useState(null);
  const [err, setErr] = useState("");
  /** Pan offset from centred position (px). */
  const [pan, setPan] = useState({ x: 0, y: 0 });
  /** Zoom multiplier ≥ 1 applied on top of “cover” scale. */
  const [zoomMul, setZoomMul] = useState(1);
  const dragging = useRef(null);

  useEffect(() => {
    if (!open || !imageSrc) return;
    setErr("");
    setPan({ x: 0, y: 0 });
    setZoomMul(1);
    setImg(null);
    let cancelled = false;
    const el = new Image();
    el.onload = () => {
      if (!cancelled) setImg(el);
    };
    el.onerror = () => {
      if (!cancelled) {
        setErr("Could not load this image for cropping.");
        setImg(null);
      }
    };
    el.crossOrigin = "anonymous";
    el.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [open, imageSrc]);

  liveRef.current.zoomMul = zoomMul;
  liveRef.current.pan = pan;
  liveRef.current.img = img;

  const metrics = useMemo(() => {
    if (!img) return null;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    const cover = Math.max(vw / iw, vh / ih);
    const S = cover * zoomMul;
    const dw = iw * S;
    const dh = ih * S;
    const left0 = (vw - dw) / 2;
    const top0 = (vh - dh) / 2;
    const left = left0 + pan.x;
    const top = top0 + pan.y;
    return { iw, ih, S, dw, dh, left, top, cover };
  }, [img, vw, vh, pan.x, pan.y, zoomMul]);

  const clampPan = useCallback(
    (px, py, zM) => {
      if (!img) return { x: 0, y: 0 };
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const cover = Math.max(vw / iw, vh / ih);
      const S = cover * zM;
      const dw = iw * S;
      const dh = ih * S;
      const left0 = (vw - dw) / 2;
      const top0 = (vh - dh) / 2;
      const minL = vw - dw;
      const maxL = 0;
      const minT = vh - dh;
      const maxT = 0;
      let left = left0 + px;
      let top = top0 + py;
      left = Math.min(maxL, Math.max(minL, left));
      top = Math.min(maxT, Math.max(minT, top));
      return { x: left - left0, y: top - top0 };
    },
    [img, vw, vh],
  );

  const onPointerDown = (e) => {
    if (!metrics) return;
    dragging.current = { lx: e.clientX, ly: e.clientY, sx: pan.x, sy: pan.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = dragging.current;
    if (!d || !metrics || !img) return;
    const dx = e.clientX - d.lx;
    const dy = e.clientY - d.ly;
    const next = clampPan(d.sx + dx, d.sy + dy, zoomMul);
    setPan(next);
  };

  const onPointerUp = (e) => {
    dragging.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!open || !el || !variant) return;
    const clampFor = (iw, ih, vw0, vh0, px, py, zM) => {
      const cover = Math.max(vw0 / iw, vh0 / ih);
      const S = cover * zM;
      const dw = iw * S;
      const dh = ih * S;
      const left0 = (vw0 - dw) / 2;
      const top0 = (vh0 - dh) / 2;
      const minL = vw0 - dw;
      const maxL = 0;
      const minT = vh0 - dh;
      const maxT = 0;
      let left = left0 + px;
      let top = top0 + py;
      left = Math.min(maxL, Math.max(minL, left));
      top = Math.min(maxT, Math.max(minT, top));
      return { x: left - left0, y: top - top0 };
    };

    const onWheel = (e) => {
      e.preventDefault();
      const cur = liveRef.current;
      const im = cur.img;
      if (!im) return;
      const iw = im.naturalWidth || im.width;
      const ih = im.naturalHeight || im.height;
      if (!iw || !ih) return;

      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const nz = Math.min(4, Math.max(1, cur.zoomMul + delta));
      if (nz === cur.zoomMul) return;
      const nextPan = clampFor(iw, ih, vw, vh, cur.pan.x, cur.pan.y, nz);
      setZoomMul(nz);
      setPan(nextPan);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, variant, vw, vh]);

  const exportJpeg = useCallback(() => {
    if (!img || !metrics) return;
    const { iw, ih, left, top, S } = metrics;

    let sx = (0 - left) / S;
    let sy = (0 - top) / S;
    let sw = vw / S;
    let sh = vh / S;

    sx = Math.max(0, Math.min(iw - 0.5, sx));
    sy = Math.max(0, Math.min(ih - 0.5, sy));
    sw = Math.max(1, Math.min(iw - sx, sw));
    sh = Math.max(1, Math.min(ih - sy, sh));

    let outW = variant === "avatar" ? outputAvatar : outputBannerW;
    let outH = variant === "avatar" ? outputAvatar : outputBannerH;

    const tryEncode = () => {
      const c = document.createElement("canvas");
      c.width = outW;
      c.height = outH;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (variant === "avatar") {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, outW, outH);
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      let q = 0.88;
      for (let step = 0; step < 18; step++) {
        const dataUrl = c.toDataURL("image/jpeg", q);
        if (dataUrl.length <= maxDataUrlChars) return dataUrl;
        q -= 0.05;
        if (q < 0.45) break;
      }
      outW = Math.max(240, Math.floor(outW * 0.88));
      outH = variant === "avatar" ? outW : Math.max(96, Math.floor(outH * 0.88));
      const c2 = document.createElement("canvas");
      c2.width = outW;
      c2.height = outH;
      const x2 = c2.getContext("2d");
      x2.imageSmoothingQuality = "high";
      x2.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      let q2 = 0.82;
      for (let step = 0; step < 14; step++) {
        const dataUrl = c2.toDataURL("image/jpeg", q2);
        if (dataUrl.length <= maxDataUrlChars) return dataUrl;
        q2 -= 0.06;
      }
      return c2.toDataURL("image/jpeg", 0.72);
    };

    try {
      const url = tryEncode();
      if (url.length > maxDataUrlChars) {
        alert("Cropped image is still too large to store. Try a smaller source image or Zoom out.");
        return;
      }
      onComplete(url);
    } catch {
      setErr("Export failed — this image may be protected. Try uploading a file instead of a remote URL.");
    }
  }, [img, metrics, variant, vw, vh, maxDataUrlChars, onComplete, outputAvatar, outputBannerW, outputBannerH]);

  if (!open || !imageSrc) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: "fixed", inset: 0, zIndex: 580, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }} />
      <div
        style={{
          position: "relative",
          width: "min(480px, 94vw)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(18,0,10,0.94)",
          boxShadow: "0 28px 80px rgba(0,0,0,0.55)",
          color: "#fff",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{title}</div>
          <button type="button" onClick={onCancel} style={ghostBtn}>Cancel</button>
        </div>

        <div style={{ padding: 16 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "rgba(240,220,220,0.62)", lineHeight: 1.45 }}>
            Drag to reposition. Scroll or use the slider to zoom. Crop matches how the image appears in the profile frame.
          </p>

          {err ? (
            <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,120,140,0.35)", fontSize: 13, marginBottom: 12 }}>{err}</div>
          ) : null}

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="crop-zoom" style={{ fontSize: 11, fontWeight: 800, color: "rgba(240,220,220,0.55)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Zoom
            </label>
            <input
              id="crop-zoom"
              type="range"
              min={100}
              max={400}
              step={5}
              value={Math.round(zoomMul * 100)}
              onChange={(e) => {
                const z = Math.max(1, Math.min(4, Number(e.target.value) / 100));
                setZoomMul(z);
                setPan((p) => clampPan(p.x, p.y, z));
              }}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <div
              ref={viewportRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              role="presentation"
              style={{
                position: "relative",
                width: vw,
                height: vh,
                borderRadius: variant === "avatar" ? "50%" : 12,
                overflow: "hidden",
                border: "2px solid rgba(255,255,255,0.18)",
                background: "#0a0a0a",
                touchAction: "none",
                cursor: dragging.current ? "grabbing" : "grab",
              }}
            >
              {metrics && img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  src={img.src}
                  draggable={false}
                  style={{
                    position: "absolute",
                    width: metrics.dw,
                    height: metrics.dh,
                    left: metrics.left,
                    top: metrics.top,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                />
              ) : (
                <div style={{ width: vw, height: vh, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(240,220,220,0.45)" }}>
                  Loading…
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={exportJpeg}
              disabled={!metrics || !!err}
              style={{ ...solidBtn, opacity: !metrics || err ? 0.5 : 1, cursor: !metrics || err ? "not-allowed" : "pointer" }}
            >
              Use cropped image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ghostBtn = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "transparent",
  color: "rgba(255,255,255,0.88)",
  padding: "7px 12px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13,
};
const solidBtn = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(135deg, rgba(255,96,128,0.32), rgba(155,0,40,0.58))",
  color: "#fff",
  padding: "9px 16px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 850,
  fontSize: 13,
};
