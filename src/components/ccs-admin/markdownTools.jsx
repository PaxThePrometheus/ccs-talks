"use client";

/** @param {string} op */
export function applyMarkdownInsert(value, selStart, selEnd, op) {
  const v = String(value ?? "");
  const a = Math.min(Math.max(0, selStart | 0), v.length);
  const b = Math.min(Math.max(0, selEnd | 0), v.length);
  const sel = v.slice(a, b);
  let rep = sel;

  switch (op) {
    case "bold":
      rep = `**${sel || "text"}**`;
      break;
    case "italic":
      rep = `*${sel || "text"}*`;
      break;
    case "strike":
      rep = `~~${sel || "text"}~~`;
      break;
    case "code":
      rep = `\`${sel || "code"}\``;
      break;
    case "link":
      rep = `[${sel || "label"}](https://)`;
      break;
    case "image":
      rep = `![${sel || "description"}](https://)`;
      break;
    case "h2":
      rep = `## ${sel || "Heading"}\n`;
      break;
    case "h3":
      rep = `### ${sel || "Subheading"}\n`;
      break;
    case "ul":
      rep = sel
        ? sel
            .split("\n")
            .map((line) => `- ${line}`)
            .join("\n")
        : "- ";
      break;
    case "ol":
      rep = sel
        ? sel
            .split("\n")
            .map((line, i) => `${i + 1}. ${line}`)
            .join("\n")
        : "1. ";
      break;
    case "quote":
      rep = sel
        ? sel
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")
        : "> ";
      break;
    case "rule":
      rep = "\n---\n";
      break;
    default:
      rep = sel;
  }

  const next = v.slice(0, a) + rep + v.slice(b);
  const focusEnd = a + rep.length;
  return { next, focusStart: focusEnd, focusEnd };
}

/**
 * @param {{ accent: string, border: string, text: string, muted: string, surfaceAlt: string }} tokens
 * @param {(op: string) => void} onOp
 */
export function MarkdownToolbarRow({ tokens, onOp, dense }) {
  const b = (label, op, title) => (
    <button
      key={op}
      type="button"
      title={title}
      onClick={(e) => {
        e.preventDefault();
        onOp(op);
      }}
      style={{
        padding: dense ? "4px 8px" : "6px 10px",
        borderRadius: 8,
        border: `1px solid ${tokens.border}`,
        background: tokens.surfaceAlt,
        color: tokens.text,
        fontSize: dense ? 11 : 12,
        fontWeight: 800,
        cursor: "pointer",
        minWidth: 28,
      }}
    >
      {label}
    </button>
  );

  return (
    <div role="toolbar" aria-label="Markdown insert" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {b("**B**", "bold", "Bold")}
      {b("*I*", "italic", "Italic")}
      {b("~~S~~", "strike", "Strikethrough")}
      {b("{ }", "code", "Inline code")}
      {b("H2", "h2", "Heading 2")}
      {b("H3", "h3", "Heading 3")}
      {b("• List", "ul", "Bullet list")}
      {b("1. List", "ol", "Numbered list")}
      {b("“", "quote", "Block quote")}
      {b("—", "rule", "Horizontal rule")}
      {b("🔗", "link", "Link")}
      {b("🖼", "image", "Image (https URL)")}
    </div>
  );
}
