/**
 * Caps aligned with server `clampPostCommentImageUrl` / `clampMediaField` (stored data URL length).
 * For uploads, use `prepareImageFileForUpload` / `prepareProfileImageFileForUpload` in
 * `imageCompressClient.js`, which re-encodes to WebP/JPEG and downsizes when needed.
 */

/** Sync with `clampPostCommentImageUrl` in store.js — max stored data:image string length */
export const MAX_POST_COMMENT_IMAGE_DATA_URL_CHARS = 256_000;

/** Sync with `clampMediaField` (avatar/banner/signature images) — max stored data:image length */
export const MAX_PROFILE_MEDIA_DATA_URL_CHARS = 360_000;

const DATA_URL_PREFIX_SLACK_CHARS = 96;

/** Approximate raw file size that should fit as base64 under the post/comment data-URL cap without re-encoding. */
export const MAX_POST_IMAGE_FILE_BYTES = Math.floor((MAX_POST_COMMENT_IMAGE_DATA_URL_CHARS - DATA_URL_PREFIX_SLACK_CHARS) * (3 / 4));

/** Approximate raw file size that should fit profile media caps without re-encoding. */
export const MAX_PROFILE_IMAGE_FILE_BYTES = Math.floor((MAX_PROFILE_MEDIA_DATA_URL_CHARS - DATA_URL_PREFIX_SLACK_CHARS) * (3 / 4));
