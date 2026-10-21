/** Shared write contract. Account responses also contain server-owned fields
 * such as id, badges and handleChangedAt that must never be sent as edits. */
export const PROFILE_EDITABLE_FIELDS = [
  "name", "handle", "college", "program", "year", "campus", "focus", "org",
  "bio", "signature", "signatureImage", "signatureLink", "avatarColor",
  "avatarAccent", "bannerColor", "bannerAccent", "avatarImage", "bannerImage",
];

export function editableProfilePatch(profile) {
  return Object.fromEntries(PROFILE_EDITABLE_FIELDS
    .filter(key => Object.hasOwn(profile || {}, key))
    .map(key => [key, profile[key]]));
}
