export const APP_CONFIG = {
  brand: {
    name: "CCS Talks",
    tagline: "A modern forum for the OLFU-CCS community.",
    org: "GROUP 4™",
  },
  landing: {
    heroSubtitle: "Announcements, threads, study circles, and community events—fast, searchable, and beautifully organized.",
    stats: [
      { k: "Members", v: "2.3k" },
      { k: "Threads", v: "18k" },
      { k: "Active today", v: "312" },
    ],
    featureCards: [
      { title: "Categories", body: "Academics, events, tech, and student life—everything has a place.", icon: "🗂️" },
      { title: "Smart search", body: "Find the exact thread in seconds. Pin, bookmark, and track topics.", icon: "🔎" },
      { title: "Profiles", body: "Badges, timeline posts, and community presence—like a campus feed.", icon: "🪪" },
    ],
    community: {
      orgs: [
        { name: "CCS Dev Guild", kind: "Org", members: 312, body: "Weekly build nights, code reviews, and shipping student projects. Open to all years.", color: "#9b0028", accent: "#ff6080", tags: ["Web", "Mobile", "OpenSource"] },
        { name: "Hack Club Antipolo", kind: "Org", members: 184, body: "Hackathon training, CTF practice, and mentorship for first-time competitors.", color: "#5a0030", accent: "#ff3a6e", tags: ["Hackathon", "Security", "Mentorship"] },
        { name: "Capstone Circle", kind: "Circle", members: 96, body: "Thesis-stage students sharing scope, panel feedback, and survival stories.", color: "#3a0014", accent: "#ffb0bd", tags: ["Capstone", "Research"] },
        { name: "Study Lounge", kind: "Circle", members: 540, body: "Subject-specific study rooms — CMSC 142, automata, DSA, and beyond.", color: "#7a0024", accent: "#ff96a6", tags: ["Academics", "Reviewers"] },
      ],
      events: [
        { title: "CCS Night 2025", when: "Nov 22", where: "OLFU Antipolo Auditorium", body: "Annual showcase, awards, and the org talent night." },
        { title: "Code & Coffee", when: "Every Friday", where: "Library 3F", body: "Casual jam — bring a laptop, leave with a PR." },
        { title: "Capstone Clinic", when: "Oct 12", where: "CCS Faculty Room", body: "Open table feedback for thesis groups." },
      ],
    },
    footer: {
      columns: [
        { title: "Product", links: ["Forum", "Profiles", "Bookmarks", "Subscriptions"] },
        { title: "Community", links: ["Events", "Study groups", "Guidelines", "Support"] },
        { title: "Build", links: ["Roadmap", "Changelog", "Feedback", "Credits"] },
      ],
      copyright: "© 2026 CCS Talks",
    },
  },
  routes: {
    landing: { title: "Home" },
    about: { title: "About" },
    forum: { title: "Forum" },
    announcements: { title: "Announcements" },
    tickets: { title: "Tickets" },
    profile: { title: "Profile" },
    timeline: { title: "My timeline" },
    activities: { title: "Activities" },
    search: { title: "Search" },
    bookmarks: { title: "Bookmarks" },
    friends: { title: "Friends" },
    subs: { title: "Subscriptions" },
    settings: { title: "Settings" },
    login: { title: "Sign in" },
    register: { title: "Sign up" },
  },
  nav: {
    top: ["about", "forum", "login"],
    sidebarPrimary: [
      { key: "forum", icon: "🏠", label: "Home" },
      { key: "search", icon: "🔎", label: "Search" },
      { key: "profile", icon: "👤", label: "Profile" },
      { key: "activities", icon: "🧾", label: "Activities" },
      { key: "bookmarks", icon: "🔖", label: "Bookmarks" },
      { key: "friends", icon: "👥", label: "Friends" },
      { key: "subs", icon: "＋", label: "Subscriptions" },
      { key: "tickets", icon: "🎫", label: "Tickets" },
    ],
    sidebarSecondary: [
      { key: "settings", icon: "⚙️", label: "Settings" },
      { key: "landing", icon: "↩", label: "Sign out" },
    ],
  },
  placeholders: {
    composer: "What's on your mind?",
    search: "Search...",
    landingCta: "Join us.",
  },
};

export const DEFAULT_PROFILE = {
  id: "u_you",
  name: "Juan Dela Cruz",
  handle: "juandc",
  status: "Student",
  university: "Our Lady of Fatima University",
  college: "College of Computer Studies",
  program: "BS Computer Science",
  year: "3rd Year",
  campus: "Antipolo",
  focus: "HCI",
  org: "CCS Dev Guild",
  bio: "Computer science student building expressive UI systems. Interests: UX engineering, realtime graphics, and app polish.",
  badges: ["Dean’s Lister", "Hackathon ’25", "Org Member"],
  /** Forum-style footer shown under posts/comments (plain text + optional image/link). */
  signature: "",
  signatureImage: "",
  signatureLink: "",
  // --- visual identity (editable) ---
  avatarColor: "#9b0028",
  avatarAccent: "#ff6080",
  bannerColor: "#3a0014",
  bannerAccent: "#ff3a6e",
};

export const FORUM_RAIL = {
  rising: ["CCS Night 2025 hype thread", "Best IDE for Java?", "Thesis defense tips megathread"],
  interests: ["Who's joining the hackathon?", "CMSC 142 reviewer shared", "Internship openings thread"],
  trending: ["#CCSNight2025", "#ThesisSeason", "#CodeAndCoffee"],
};

