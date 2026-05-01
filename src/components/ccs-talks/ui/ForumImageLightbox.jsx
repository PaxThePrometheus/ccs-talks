"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

const ZOOM_MIN = 0.35;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const lbl = {
  fontSize: 9,
  fontWeight: 800,
  color: "rgba(255,255,255,0.52)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  whiteSpace: "nowrap",
};

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/** Axis-aligned bounding box of rectangle (baseW × baseH) scaled then rotated around center. */
function panCaps(viewW, viewH, baseW, baseH, scale, rotationDeg) {
  if (!viewW || !viewH || !baseW || !baseH) return { maxPX: 0, maxPY: 0 };
  const r = (rotationDeg * Math.PI) / 180;
  const bw = baseW * scale;
  const bh = baseH * scale;
  const boxW = Math.abs(bw * Math.cos(r)) + Math.abs(bh * Math.sin(r));
  const boxH = Math.abs(bw * Math.sin(r)) + Math.abs(bh * Math.cos(r));
  const maxPX = Math.max(0, (boxW - viewW) / 2);
  const maxPY = Math.max(0, (boxH - viewH) / 2);
  return { maxPX, maxPY };
}

function SliderBlock({ label, valueText, children, narrow }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        width: narrow ? "min(100%, 260px)" : 152,
        minWidth: narrow ? 0 : 152,
      }}
    >
      <span style={lbl}>{label}</span>
      {children}
      <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,240,240,0.88)", letterSpacing: "-0.02em" }}>{valueText}</span>
    </div>
  );
}

/**
 * Full-screen image viewer: zoom + rotate + share + download.
 * Toolbar on the right (wide) or bottom row (narrow).
 */
export function ForumImageLightbox({ open, src, onClose, title = "Image" }) {
  const [narrow, setNarrow] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imgLayout, setImgLayout] = useState({ baseW: 0, baseH: 0, viewW: 0, viewH: 0 });
  const [dragging, setDragging] = useState(false);

  const measureRef = useRef(null);
  const imgRef = useRef(null);
  const dragOrigin = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 });

  const caps = useMemo(
    () => panCaps(imgLayout.viewW, imgLayout.viewH, imgLayout.baseW, imgLayout.baseH, scale, rotation),
    [imgLayout, scale, rotation]
  );

  const canPan = caps.maxPX > 1 || caps.maxPY > 1;

  const syncLayout = useCallback(() => {
    const mr = measureRef.current;
    const img = imgRef.current;
    if (!mr || !img) return;
    const vw = mr.clientWidth;
    const vh = mr.clientHeight;
    const baseW = img.offsetWidth || 1;
    const baseH = img.offsetHeight || 1;
    setImgLayout({ baseW, baseH, viewW: vw, viewH: vh });
  }, []);

  const clampPanToBounds = useCallback(
    (x, y) => {
      const { maxPX, maxPY } = panCaps(imgLayout.viewW, imgLayout.viewH, imgLayout.baseW, imgLayout.baseH, scale, rotation);
      return { x: clamp(x, -maxPX, maxPX), y: clamp(y, -maxPY, maxPY) };
    },
    [imgLayout, scale, rotation]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open || !measureRef.current) return undefined;

    syncLayout();

    let ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            syncLayout();
          })
        : null;

    ro?.observe(measureRef.current);

    const onResize = () => syncLayout();
    window.addEventListener("resize", onResize);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [open, narrow, syncLayout]);

  useEffect(() => {
    if (!open) return undefined;
    setScale(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    setPan((p) => clampPanToBounds(p.x, p.y));
  }, [scale, rotation, imgLayout.baseW, imgLayout.baseH, imgLayout.viewW, imgLayout.viewH, clampPanToBounds]);

  const onPointerDown = useCallback(
    (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!canPan) return;
      e.preventDefault();
      dragOrigin.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [canPan, pan.x, pan.y]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!dragging) return;
      e.preventDefault();
      const ox = dragOrigin.current;
      const dx = e.clientX - ox.clientX;
      const dy = e.clientY - ox.clientY;
      const next = clampPanToBounds(ox.panX + dx, ox.panY + dy);
      setPan(next);
    },
    [dragging, clampPanToBounds]
  );

  const onPointerUp = useCallback((e) => {
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  const isDataUrl = useMemo(() => typeof src === "string" && /^data:image\//i.test(src), [src]);
  const isHttps = useMemo(() => typeof src === "string" && /^https?:\/\//i.test(src), [src]);

  const zoomIn = useCallback(() => setScale((s) => Math.min(ZOOM_MAX, Math.round((s + ZOOM_STEP) * 100) / 100)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(ZOOM_MIN, Math.round((s - ZOOM_STEP) * 100) / 100)), []);
  const zoomReset = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);
  const rotateCW = useCallback(() => setRotation((r) => (r + 90) % 360), []);

  const handleShare = useCallback(async () => {
    if (!src) return;
    try {
      if (navigator.share) {
        if (isHttps) {
          await navigator.share({ title, url: src });
          return;
        }
        if (isDataUrl) {
          const res = await fetch(src);
          const blob = await res.blob();
          const ext = blob.type.split("/")[1]?.split("+")[0] || "png";
          const file = new File([blob], `ccs-image.${ext}`, { type: blob.type });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title });
            return;
          }
        }
      }
    } catch {
      /* user cancelled or unsupported */
    }
    if (isHttps) {
      try {
        await navigator.clipboard.writeText(src);
        window.alert("Image link copied to clipboard.");
        return;
      } catch {
        /* fall through */
      }
    }
    window.alert("Sharing isn’t available for this image here. Try Save.");
  }, [src, title, isDataUrl, isHttps]);

  const handleDownload = useCallback(() => {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    const safe = String(title).replace(/[^\w.-]+/g, "_").slice(0, 40) || "image";
    a.download = isHttps ? `${safe}.jpg` : `${safe}.png`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [src, title, isHttps]);

  if (!open || !src || typeof document === "undefined") return null;

  const grabCursor = canPan ? (dragging ? "grabbing" : "grab") : "default";

  const toolbarBtn = {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    padding: "10px 8px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    minWidth: narrow ? 52 : 54,
    flex: narrow ? "1 1 auto" : undefined,
  };

  const zoomSlider = (
    <SliderBlock label="Zoom" valueText={`${Math.round(scale * 100)}%`} narrow={narrow}>
      <input
        className="ccs-forum-lightbox-range"
        type="range"
        aria-label="Zoom level"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={0.05}
        value={scale}
        onChange={(e) => setScale(Number(e.target.value))}
      />
    </SliderBlock>
  );

  const rotateSlider = (
    <SliderBlock label="Rotate" valueText={`${rotation}°`} narrow={narrow}>
      <input
        className="ccs-forum-lightbox-range"
        type="range"
        aria-label="Rotation angle"
        min={0}
        max={359}
        step={1}
        value={rotation}
        onChange={(e) => setRotation(Number(e.target.value))}
      />
    </SliderBlock>
  );

  const toolbar = (
    <div
      style={{
        display: "flex",
        flexDirection: narrow ? "row" : "column",
        flexWrap: narrow ? "wrap" : "nowrap",
        justifyContent: narrow ? "center" : "flex-start",
        alignContent: narrow ? "center" : undefined,
        gap: narrow ? 10 : 12,
        padding: narrow ? "12px 10px calc(12px + env(safe-area-inset-bottom, 0px))" : "18px 12px",
        borderLeft: narrow ? "none" : "1px solid rgba(255,255,255,0.10)",
        borderTop: narrow ? "1px solid rgba(255,255,255,0.10)" : "none",
        background: "rgba(12,2,8,0.92)",
        flexShrink: 0,
        alignItems: narrow ? "stretch" : "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: narrow ? "row" : "column", gap: narrow ? 8 : 10, flexWrap: narrow ? "wrap" : "nowrap", justifyContent: "center" }}>
        <button type="button" onClick={zoomIn} style={toolbarBtn} title="Zoom in">
          <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>+</span>
          Zoom
        </button>
        <button type="button" onClick={zoomOut} style={toolbarBtn} title="Zoom out">
          <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>−</span>
          Out
        </button>
        <button type="button" onClick={zoomReset} style={toolbarBtn} title="Reset zoom to 100%">
          <span style={{ fontSize: 13, fontWeight: 900 }}>1:1</span>
          Reset
        </button>
      </div>

      {narrow ? (
        <div style={{ flex: "1 1 100%", width: "100%", display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
          {zoomSlider}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
            <button type="button" onClick={rotateCW} style={toolbarBtn} title="Rotate 90° clockwise">
              <span style={{ fontSize: 18 }}>↻</span>
              90°
            </button>
            <button type="button" onClick={() => setRotation(0)} style={toolbarBtn} title="Reset rotation to 0°">
              <span style={{ fontSize: 13, fontWeight: 900 }}>0°</span>
              Align
            </button>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>{rotateSlider}</div>
          </div>
        </div>
      ) : (
        <>
          {zoomSlider}
          <div style={{ width: "100%", height: 1, maxWidth: 148, background: "rgba(255,255,255,0.08)", margin: "2px 0" }} aria-hidden />
          <button type="button" onClick={rotateCW} style={toolbarBtn} title="Rotate 90° clockwise">
            <span style={{ fontSize: 18 }}>↻</span>
            90°
          </button>
          {rotateSlider}
          <button type="button" onClick={() => setRotation(0)} style={toolbarBtn} title="Reset rotation to 0°">
            <span style={{ fontSize: 13, fontWeight: 900 }}>0°</span>
            Align
          </button>
        </>
      )}

      <div style={{ display: "flex", flexDirection: narrow ? "row" : "column", gap: narrow ? 8 : 10, flexWrap: narrow ? "wrap" : "nowrap", justifyContent: "center" }}>
        <button type="button" onClick={() => void handleShare()} style={toolbarBtn} title="Share">
          <Icon name="share" size={18} />
          Share
        </button>
        <button type="button" onClick={handleDownload} style={toolbarBtn} title="Download">
          <span style={{ fontSize: 17 }}>⤓</span>
          Save
        </button>
      </div>
    </div>
  );

  const panelHeight = narrow
    ? "calc(100dvh - max(56px, env(safe-area-inset-top)) - max(20px, env(safe-area-inset-bottom)))"
    : "min(92vh, 900px)";

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 780,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: narrow ? 8 : 16,
        boxSizing: "border-box",
      }}
    >
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }} />
      <button
        type="button"
        aria-label="Close image viewer"
        onClick={onClose}
        style={{
          position: "absolute",
          top: "max(12px, env(safe-area-inset-top, 0px))",
          left: "max(12px, env(safe-area-inset-left, 0px))",
          zIndex: 2,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(20,0,10,0.80)",
          color: "#fff",
          borderRadius: 12,
          padding: "10px 14px",
          cursor: "pointer",
          fontWeight: 900,
          fontSize: 13,
        }}
      >
        ✕ Close
      </button>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: narrow ? "100%" : "min(96vw, 1120px)",
          maxWidth: "100%",
          height: panelHeight,
          maxHeight: panelHeight,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(16,2,10,0.55)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: narrow ? "column" : "row",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          className="ccs-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
            position: "relative",
          }}
          title={canPan ? "Drag to pan the image when zoomed" : undefined}
        >
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- pan surface for transformed image */}
          <div
            ref={measureRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onLostPointerCapture={() => setDragging(false)}
            style={{
              position: "absolute",
              left: narrow ? 12 : 20,
              right: narrow ? 12 : 20,
              top: narrow ? 12 : 20,
              bottom: narrow ? 12 : 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: grabCursor,
              touchAction: canPan ? "none" : "pan-y",
              userSelect: "none",
            }}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${scale})`,
                transformOrigin: "center center",
                willChange: dragging ? "transform" : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- user content data URLs */}
              <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                onLoad={syncLayout}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "block",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </div>
        {toolbar}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
