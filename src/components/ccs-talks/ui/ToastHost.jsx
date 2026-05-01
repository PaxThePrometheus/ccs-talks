"use client";

import { useEffect, useState } from "react";
import { toastSubscribe } from "../state/toastBus";

const DEFAULT_MS = 4200;

export function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return toastSubscribe((item) => {
      setItems((xs) => [...xs, item]);
      window.setTimeout(() => {
        setItems((xs) => xs.filter((x) => x.id !== item.id));
      }, DEFAULT_MS);
    });
  }, []);

  if (!items.length) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: "min(92vw, 420px)",
        pointerEvents: "none",
      }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: "auto",
            padding: "12px 16px",
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 750,
            lineHeight: 1.35,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            border:
              t.type === "error"
                ? "1px solid rgba(255,120,140,0.55)"
                : t.type === "success"
                  ? "1px solid rgba(120,220,160,0.45)"
                  : "1px solid rgba(255,255,255,0.12)",
            background:
              t.type === "error"
                ? "linear-gradient(135deg, rgba(80,0,20,0.95), rgba(40,0,10,0.98))"
                : t.type === "success"
                  ? "linear-gradient(135deg, rgba(0,50,30,0.95), rgba(0,25,18,0.98))"
                  : "linear-gradient(135deg, rgba(30,30,40,0.95), rgba(12,12,18,0.98))",
            color: t.type === "success" ? "rgba(220,255,235,0.95)" : "rgba(255,245,248,0.95)",
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
