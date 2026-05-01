/** Fixed university label for this deployment; enforced on read/write. */
export const CCS_OLFU_UNIVERSITY = "Our Lady of Fatima University";

/** Minimum time between successful username (`profile.handle`) changes. */
export const USERNAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Default selectable values; merged with site settings (`profileFieldOptions`). */
export const DEFAULT_PROFILE_FIELD_OPTIONS = {
  programs: ["BS Computer Science", "BS Information Technology", "BS Data Science", "Assoc. Computer Technology"],
  campuses: ["Antipolo", "Valenzuela", "Quezon City", "Pampanga", "Other"],
  years: ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate", "Irregular"],
  focuses: ["HCI", "Web", "Mobile", "Security", "Data", "Systems", "General"],
  orgs: ["CCS Dev Guild", "Hack Club Antipolo", "None", "Capstone Circle"],
};

/** @typedef {typeof DEFAULT_PROFILE_FIELD_OPTIONS} ProfileFieldOptions */

const OPTION_KEYS = Object.keys(DEFAULT_PROFILE_FIELD_OPTIONS);

/**
 * Merge stored site options with defaults (strings only, capped).
 * @param {unknown} partial
 * @returns {typeof DEFAULT_PROFILE_FIELD_OPTIONS}
 */
export function mergeProfileFieldOptions(partial) {
  /** @type {typeof DEFAULT_PROFILE_FIELD_OPTIONS} */
  const out = { ...DEFAULT_PROFILE_FIELD_OPTIONS };
  if (!partial || typeof partial !== "object") return out;

  for (const k of OPTION_KEYS) {
    const arr = partial[k];
    if (!Array.isArray(arr)) continue;
    /** @type {string[]} */
    const next = arr
      .map((x) => String(x || "").trim().slice(0, 96))
      .filter(Boolean)
      .slice(0, 96);
    if (next.length) out[k] = next;
  }
  return out;
}

const PROFILE_TO_OPTION_KEY = Object.freeze([
  ["program", "programs"],
  ["campus", "campuses"],
  ["year", "years"],
  ["focus", "focuses"],
  ["org", "orgs"],
]);

/**
 * If admins configured choices, coerce profile fields to the allowed list.
 * Empty string when invalid.
 */
export function sanitizeProfileSelectFields(profile, mergedOptions) {
  if (!profile || typeof profile !== "object") return;

  for (const [field, optKey] of PROFILE_TO_OPTION_KEY) {
    const choices = mergedOptions[optKey];
    if (!Array.isArray(choices) || choices.length === 0) continue;

    const raw = profile[field];
    const v = typeof raw === "string" ? raw.trim().slice(0, 120) : "";
    if (!v || !choices.includes(v)) profile[field] = "";
    else profile[field] = v;
  }
}
