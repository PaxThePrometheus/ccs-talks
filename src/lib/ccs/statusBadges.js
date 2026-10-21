/** Faculty title stored on profile (`publicRoleBadge`). Set only via admin console. */
export const FACULTY_PUBLIC_ROLE_BADGE_KEYS = ["teacher", "instructor", "dean", "professor"];

const FACULTY_MAP = {
  teacher: "Teacher",
  instructor: "Instructor",
  dean: "Dean",
  professor: "Professor",
};

const FACULTY_SET = new Set(FACULTY_PUBLIC_ROLE_BADGE_KEYS);

/**
 * @param {unknown} v
 * @returns {"teacher" | "instructor" | "dean" | "professor" | null}
 */
export function sanitizePublicRoleBadge(v) {
  if (v == null || v === "") return null;
  const k = String(v).trim().toLowerCase();
  return FACULTY_SET.has(k) ? /** @type {const} */ (k) : null;
}

/**
 * Public “status” chip next to handles (forum role + optional faculty title).
 * Expects `forumRole` on merged user cards (`admin` | `moderator` | `student`) from the user row.
 */
export function statusBadgeDisplayLabels(user) {
  const forumRole = typeof user?.forumRole === "string" ? user.forumRole.trim().toLowerCase() : "student";
  const labels = [];
  if (forumRole === "admin") labels.push("Administrator");
  if (forumRole === "moderator") labels.push("Moderator");
  const pr = sanitizePublicRoleBadge(user?.publicRoleBadge);
  if (pr && FACULTY_MAP[pr]) labels.push(FACULTY_MAP[pr]);
  return labels;
}
