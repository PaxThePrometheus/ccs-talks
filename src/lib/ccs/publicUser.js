/** Fields safe to expose in API responses after auth / for author cards. */

import { sanitizePublicRoleBadge } from "./statusBadges";

export function toPublicProfile(p) {
  if (!p || typeof p !== "object") return null;
  return {
    id: p.id,
    name: p.name,
    handle: p.handle,
    status: p.status,
    university: p.university,
    college: p.college,
    program: p.program,
    year: p.year,
    campus: p.campus,
    focus: p.focus,
    org: p.org,
    bio: p.bio,
    badges: Array.isArray(p.badges) ? p.badges : [],
    /** Faculty / instructor title only; admins set via admin console. */
    publicRoleBadge: sanitizePublicRoleBadge(p.publicRoleBadge),
    signature: typeof p.signature === "string" ? p.signature : "",
    signatureImage: typeof p.signatureImage === "string" ? p.signatureImage : "",
    signatureLink: typeof p.signatureLink === "string" ? p.signatureLink : "",
    avatarColor: p.avatarColor,
    avatarAccent: p.avatarAccent,
    bannerColor: p.bannerColor,
    bannerAccent: p.bannerAccent,
    avatarImage: p.avatarImage,
    bannerImage: p.bannerImage,
  };
}
