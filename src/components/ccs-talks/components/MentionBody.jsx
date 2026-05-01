"use client";

/** Split text into segments; @handle tokens become links when handle exists in directory. */
export function MentionBody({ text, handleToUserId, color, onVisitUser, style }) {
  const t = text == null ? "" : String(text);
  const parts = [];
  const re = /@([\w.]+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(t)) !== null) {
    if (m.index > last) parts.push({ type: "text", v: t.slice(last, m.index) });
    const handle = m[1];
    const uid = handleToUserId?.[handle.toLowerCase()];
    parts.push({ type: "mention", handle, uid });
    last = m.index + m[0].length;
  }
  if (last < t.length) parts.push({ type: "text", v: t.slice(last) });

  return (
    <span style={style}>
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i}>{p.v}</span>;
        if (p.uid && onVisitUser) {
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onVisitUser?.(p.uid);
              }}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                cursor: "pointer",
                color: color || "inherit",
                fontWeight: 800,
                textDecoration: "underline",
                font: "inherit",
              }}
            >
              @{p.handle}
            </button>
          );
        }
        return <span key={i}>@{p.handle}</span>;
      })}
    </span>
  );
}

export function buildHandleDirectory(users) {
  const map = {};
  if (!users || typeof users !== "object") return map;
  for (const u of Object.values(users)) {
    if (u?.handle) map[String(u.handle).toLowerCase()] = u.id;
  }
  return map;
}
