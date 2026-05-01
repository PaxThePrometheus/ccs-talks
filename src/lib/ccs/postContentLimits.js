/** Forum post body hard cap (~10–13k prose; aligns with Discord-style long posts minus bloated payloads). */
export const CCS_POST_BODY_MAX_CHARS = 12_800;

/** Comment body cap (keeps threads readable; still room for long explanations). */
export const CCS_COMMENT_BODY_MAX_CHARS = 8000;

/** Feed card teaser before “open thread” (~3–4 short paragraphs plain text equiv.). */
export const CCS_FEED_PREVIEW_MAX_CHARS = 480;

/**
 * Trim source for inline feed previews (raw markdown substring; ellipsis when over limit).
 * @param {unknown} markdownLike
 * @param {number} [max]
 */
export function truncateForFeedPreview(markdownLike, max = CCS_FEED_PREVIEW_MAX_CHARS) {
  const raw = markdownLike == null ? "" : String(markdownLike);
  const t = raw.trim();
  if (t.length <= max) return { text: t, truncated: false };
  const cut = t.slice(0, max).trimEnd();
  return { text: cut ? `${cut}…` : "…", truncated: true };
}
