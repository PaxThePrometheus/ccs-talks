/**
 * Browser-only: raster images → compressed WebP (or JPEG) data URLs that fit server caps.
 * Import only from Client Components ("use client").
 */

import {
  MAX_POST_COMMENT_IMAGE_DATA_URL_CHARS,
  MAX_PROFILE_MEDIA_DATA_URL_CHARS,
} from "@/lib/ccs/imageUploadLimits";

/** Hard cap before decode — avoids OOM from multi‑MB sources. */
const MAX_INPUT_FILE_BYTES = 40 * 1024 * 1024;

/** Longest edge decode cap (pixels) — downscale aggressively only if blob still oversized. */
const INITIAL_MAX_DIMENSION = 4096;

const HARD_MIN_DIMENSION = 256;

function approximateDataUrlCharCount(byteLength, prefixLen = 32) {
  if (byteLength <= 0) return prefixLen;
  return prefixLen + 4 * Math.ceil(byteLength / 3);
}

function blobBytesBudget(maxDataUrlChars, prefixSlack = 96) {
  return Math.max(8192, Math.floor((maxDataUrlChars - prefixSlack) * (3 / 4)));
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read failed"));
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.readAsDataURL(file);
  });
}

function readBlobAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read failed"));
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || null), mime, quality);
  });
}

/** @type {boolean | null} */
let _webpEncodeOk = null;

async function canEncodeWebP() {
  if (_webpEncodeOk !== null) return _webpEncodeOk;
  try {
    if (typeof document === "undefined") return false;
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 4;
    const b = await canvasToBlob(c, "image/webp", 0.8);
    _webpEncodeOk = !!(b && b.type === "image/webp");
  } catch {
    _webpEncodeOk = false;
  }
  return _webpEncodeOk;
}

function loadImageFromUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode"));
    img.src = src;
  });
}

async function decodeToBitmap(file, objectUrl) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      const img = await loadImageFromUrl(objectUrl);
      return await createImageBitmap(img);
    } catch {
      const img = await loadImageFromUrl(objectUrl);
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("2d context");
      ctx.drawImage(img, 0, 0);
      return await createImageBitmap(c);
    }
  }
}

async function rasterFromFile(file, objectUrl, maxDim) {
  /** @type {ImageBitmap | null} */
  let bmp = null;
  try {
    bmp = await decodeToBitmap(file, objectUrl);
    let w = bmp.width;
    let h = bmp.height;
    if (w <= 0 || h <= 0) throw new Error("empty image");
    const longest = Math.max(w, h);
    if (longest > maxDim) {
      const s = maxDim / longest;
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    return { canvas, w, h };
  } finally {
    bmp?.close?.();
  }
}

async function tryEncodeUnderLimit(canvas, maxDataUrlChars, preferWebp) {
  const useWebp = preferWebp && (await canEncodeWebP());
  const mime = useWebp ? "image/webp" : "image/jpeg";
  const prefixLen = (useWebp ? "data:image/webp;base64," : "data:image/jpeg;base64,").length;

  const qualities = useWebp
    ? [0.92, 0.86, 0.8, 0.74, 0.68, 0.62, 0.56, 0.52, 0.48]
    : [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

  for (const q of qualities) {
    const blob = await canvasToBlob(canvas, mime, q);
    if (!blob) continue;
    if (approximateDataUrlCharCount(blob.size, prefixLen) <= maxDataUrlChars) {
      const url = await readBlobAsDataURL(blob);
      if (url.length <= maxDataUrlChars) return url;
    }
  }
  return null;
}

/** Downscale + re‑encode until output fits server data‑URL limit. */
async function iterativeCompress(canvas, /** @type {number} */ w, /** @type {number} */ h, maxDataUrlChars, preferWebp) {
  /** @type {HTMLCanvasElement} */
  let work = canvas;
  let ww = w;
  let hh = h;

  for (let pass = 0; pass < 18; pass++) {
    const url = await tryEncodeUnderLimit(work, maxDataUrlChars, preferWebp);
    if (url) return url;

    const nextW = Math.max(HARD_MIN_DIMENSION, Math.round(ww * 0.82));
    const nextH = Math.max(HARD_MIN_DIMENSION, Math.round(hh * 0.82));
    if (nextW >= ww && nextH >= hh) break;
    if (nextW === ww && nextH === hh) break;

    const next = document.createElement("canvas");
    next.width = nextW;
    next.height = nextH;
    const nctx = next.getContext("2d");
    if (!nctx) break;
    nctx.imageSmoothingEnabled = true;
    nctx.imageSmoothingQuality = "high";
    nctx.drawImage(work, 0, 0, nextW, nextH);
    work = next;
    ww = nextW;
    hh = nextH;
  }
  return null;
}

function alertFail(contextLabel, detail) {
  if (typeof window !== "undefined") {
    window.alert(
      `${contextLabel}: could not compress enough to upload (${detail}). Try a smaller image or paste an https image URL.`,
    );
  }
}

/**
 * Produce a data URL suitable for PATCH /posts (clampPostCommentImageUrl).
 * Uses original encoding when already under limit; otherwise WebP/JPEG ramp + resize.
 *
 * @param {File} file
 * @param {{ maxDataUrlChars?: number; contextLabel?: string }} opts
 */
export async function prepareImageFileForUpload(
  file,
  { maxDataUrlChars = MAX_POST_COMMENT_IMAGE_DATA_URL_CHARS, contextLabel = "Post image" } = {},
) {
  if (!file || typeof file.type !== "string" || !file.type.startsWith("image/")) return "";
  if (file.type === "image/svg+xml") {
    alertFail(contextLabel, "SVG is not supported for inline upload — use PNG/JPEG/WebP or a URL");
    return "";
  }
  if (file.size > MAX_INPUT_FILE_BYTES) {
    alertFail(contextLabel, "file exceeds 40 MB safety limit");
    return "";
  }

  const budgetBytes = blobBytesBudget(maxDataUrlChars);
  /** Small enough that base64 expansion should stay under limit — verify with real read. */
  if (file.size <= budgetBytes) {
    try {
      const direct = await readFileAsDataURL(file);
      if (direct.length <= maxDataUrlChars) return direct;
    } catch {
      /* fall through to compress */
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const { canvas, w, h } = await rasterFromFile(file, objectUrl, INITIAL_MAX_DIMENSION);
    const out = await iterativeCompress(canvas, w, h, maxDataUrlChars, true);
    if (out) return out;
    alertFail(contextLabel, "even after resizing");
    return "";
  } catch {
    alertFail(contextLabel, "could not decode this image type");
    return "";
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Profile media — larger server cap (`clampMediaField`).
 */
export async function prepareProfileImageFileForUpload(
  file,
  { maxDataUrlChars = MAX_PROFILE_MEDIA_DATA_URL_CHARS, contextLabel = "Image" } = {},
) {
  return prepareImageFileForUpload(file, { maxDataUrlChars, contextLabel });
}
