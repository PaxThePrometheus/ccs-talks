"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Internal mention links keep @-handles clickable after markdown parses. */
export const CCS_MENTION_HREF_PREFIX = "#ccs-mention:";

/** Turn @handles into markdown links before parsing (works outside fenced code minimally). */
export function preprocessMarkdownMentions(text) {
  const t = text == null ? "" : String(text);
  return t.replace(/(^|[^\w])@([\w.]+)/g, (full, prefix, handle) => {
    return `${prefix}[${handle}](${CCS_MENTION_HREF_PREFIX}${encodeURIComponent(handle)})`;
  });
}

function isSafeHttpUrl(href) {
  if (!href || typeof href !== "string") return false;
  return /^https?:\/\//i.test(href);
}

/**
 * GFM Markdown for posts, comments, announcements.
 * No raw HTML; external links open in new tab.
 */
export function CcsMarkdown({
  source,
  accentColor,
  handleToUserId,
  onVisitUser,
  tokens,
}) {
  const accent = accentColor || tokens?.accent || "#ff6080";
  const muted = tokens?.textMuted || "rgba(240,220,220,0.75)";
  const md = preprocessMarkdownMentions(source);

  return (
    <div className="ccs-md" style={{ "--ccs-md-muted": muted, "--ccs-md-accent": accent, color: tokens?.text }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children, ...rest }) {
            if (href && href.startsWith(CCS_MENTION_HREF_PREFIX)) {
              const raw = decodeURIComponent(href.slice(CCS_MENTION_HREF_PREFIX.length));
              const uid = handleToUserId?.[raw.toLowerCase()];
              const childTxt = typeof children?.[0] === "string" ? children[0] : raw;
              if (uid && onVisitUser) {
                return (
                  <button
                    type="button"
                    className="ccs-md-mention"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onVisitUser(uid);
                    }}
                  >
                    @{childTxt || raw}
                  </button>
                );
              }
              return (
                <span className="ccs-md-mention-fallback" style={{ color: accent, fontWeight: 700 }}>
                  @{childTxt || raw}
                </span>
              );
            }

            const safe = isSafeHttpUrl(href);
            return (
              <a
                {...rest}
                href={safe ? href : undefined}
                {...(safe ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {children}
              </a>
            );
          },
          img({ src, alt, ...rest }) {
            const ok = typeof src === "string" && /^https?:\/\//i.test(src);
            if (!ok) return null;
            return <img {...rest} src={src} alt={typeof alt === "string" ? alt : ""} className="ccs-md-img" />;
          },
          p(props) {
            return <p {...props} />;
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
