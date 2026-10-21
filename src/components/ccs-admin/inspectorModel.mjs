export const INSPECTOR_SECTIONS = [
  { key: "overview", label: "Overview", group: "Manage", description: "Community totals and operational diagnostics." },
  { key: "reports", label: "Reports", group: "Community", endpoint: "/api/admin/reports", dataKey: "reports", description: "Review reports with their original context." },
  { key: "tickets", label: "Tickets", group: "Community", endpoint: "/api/admin/tickets", dataKey: "tickets", description: "A clear place for every support request." },
  { key: "users", label: "People", group: "Community", endpoint: "/api/admin/users", dataKey: "users", description: "Accounts, profiles and community roles." },
  { key: "posts", label: "Posts", group: "Community", endpoint: "/api/admin/posts", dataKey: "posts", description: "The conversations shaping your community." },
  { key: "announcements", label: "Announcements", group: "Publishing", endpoint: "/api/admin/announcements", dataKey: "announcements", description: "Keep your community in the loop." },
  { key: "landing", label: "Landing page", group: "Publishing", description: "Manage your community’s first impression." },
  { key: "audit", label: "Audit log", group: "Manage", endpoint: "/api/admin/audit", dataKey: "entries", description: "A record of staff actions and changes." },
  { key: "site", label: "Settings", group: "Manage", description: "Community policies and profile options." },
  { key: "security", label: "Account security", group: "Manage", description: "Protect your account and recovery methods." },
];

export function recordTitle(section, record) {
  if (section === "users") return record.profile?.name || record.email || "Member";
  if (section === "reports") return record.reason || "Post report";
  if (section === "tickets") return record.subject || "Support request";
  if (section === "posts") return record.content?.trim() || "Image post";
  if (section === "audit") return String(record.action || "Staff action").replaceAll("_", " ");
  return record.title || "Untitled";
}

export function recordSubtitle(section, record) {
  if (section === "users") return `@${record.profile?.handle || "member"} · ${record.role}`;
  if (section === "reports") return `Post ${record.postId} · Open`;
  if (section === "tickets") return record.status === "closed" ? "Closed" : "Awaiting staff";
  if (section === "posts") return `${record.tag || "General"}${record.pinned ? " · Pinned" : ""}`;
  if (section === "audit") return record.actorName || `Staff ${record.actorId}`;
  return record.pinned ? "Published · Pinned" : "Published";
}

export function filterRecords(records, section, query) {
  const term = query.trim().toLowerCase();
  if (!term) return records;
  return records.filter((record) => [recordTitle(section, record), recordSubtitle(section, record), record.id, record.email].filter(Boolean).join(" ").toLowerCase().includes(term));
}
