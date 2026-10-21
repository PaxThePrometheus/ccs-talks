const paths = {
  overview: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 9v12" /></>,
  reports: <><path d="M5 21V4c6-5 8 5 14 0v11c-6 5-8-5-14 0" /></>,
  tickets: <><path d="M4 5h16v14H4zM4 13h5l2 3h2l2-3h5" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5" /></>,
  posts: <><path d="M5 5h14M5 10h14M5 15h14M5 20h8" /></>,
  announcements: <><path d="m4 10 15-6v15L4 14zM7 15l2 6h3M21 8v7" /></>,
  landing: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>,
  audit: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l4 2" /></>,
  site: <><path d="M3 7h18M3 17h18" /><circle cx="8" cy="7" r="3" /><circle cx="16" cy="17" r="3" /></>,
  security: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6" /></>,
  exit: <><path d="M10 4H4v16h6M13 8l5 4-5 4M8 12h12" /></>,
  back: <path d="m14 5-7 7 7 7" />,
  refresh: <><path d="M20 10a8 8 0 0 0-14-5L3 8M3 3v5h5M4 14a8 8 0 0 0 14 5l3-3M21 21v-5h-5" /></>,
  external: <><path d="M14 3h7v7M21 3 10 14M10 3H3v18h18v-7" /></>,
};

export function AdminGlyph({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.overview}</svg>;
}
