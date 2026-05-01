const APP_CONFIG = {
  brand: {
    name: "CCS Talks",
    tagline: "A modern forum for the OLFU-CCS community.",
    org: "GROUP 4™",
  },
  landing: {
    heroSubtitle:
      "Announcements, threads, study circles, and community events—fast, searchable, and beautifully organized.",
    stats: [
      { k: "Members", v: "2.3k" },
      { k: "Threads", v: "18k" },
      { k: "Active today", v: "312" },
    ],
    featureCards: [
      {
        title: "Categories",
        body: "Academics, events, tech, and student life—everything has a place.",
        icon: "🗂️",
      },
      { title: "Smart search", body: "Find the exact thread in seconds. Pin, bookmark, and track topics.", icon: "🔎" },
      { title: "Profiles", body: "Badges, timeline posts, and community presence—like a campus feed.", icon: "🪪" },
    ],
    community: {
      orgs: [
        {
          name: "CCS Dev Guild",
          kind: "Org",
          members: 312,
          body: "Weekly build nights, code reviews, and shipping student projects. Open to all years.",
          color: "#9b0028",
          accent: "#ff6080",
          tags: ["Web", "Mobile", "OpenSource"],
        },
        {
          name: "Hack Club Antipolo",
          kind: "Org",
          members: 184,
          body: "Hackathon training, CTF practice, and mentorship for first-time competitors.",
          color: "#5a0030",
          accent: "#ff3a6e",
          tags: ["Hackathon", "Security", "Mentorship"],
        },
        {
          name: "Capstone Circle",
          kind: "Circle",
          members: 96,
          body: "Thesis-stage students sharing scope, panel feedback, and survival stories.",
          color: "#3a0014",
          accent: "#ffb0bd",
          tags: ["Capstone", "Research"],
        },
        {
          name: "Study Lounge",
          kind: "Circle",
          members: 540,
          body: "Subject-specific study rooms — CMSC 142, automata, DSA, and beyond.",
          color: "#7a0024",
          accent: "#ff96a6",
          tags: ["Academics", "Reviewers"],
        },
      ],
      events: [
        {
          title: "CCS Night 2025",
          when: "Nov 22",
          where: "OLFU Antipolo Auditorium",
          body: "Annual showcase, awards, and the org talent night.",
        },
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
  nav: {
    sidebarPrimary: [
      { key: "forum", icon: "🏠", label: "Home" },
      { key: "search", icon: "🔎", label: "Search" },
      { key: "profile", icon: "👤", label: "Profile" },
      { key: "activities", icon: "🧾", label: "Activities" },
      { key: "bookmarks", icon: "🔖", label: "Bookmarks" },
      { key: "friends", icon: "👥", label: "Friends" },
      { key: "subs", icon: "＋", label: "Subscriptions" },
    ],
    sidebarSecondary: [
      { key: "settings", icon: "⚙️", label: "Settings" },
      { key: "landing", icon: "↩", label: "Sign out" },
    ],
  },
};

const MOCK_POSTS = [
  {
    id: 1,
    userId: "u_renz",
    avatar: "RS",
    time: "2h ago",
    content:
      "Just finished our capstone defense! Three years of blood, sweat and debugging paid off. Shoutout to our adviser Sir Navarro for the guidance 🎓",
    likes: 47,
    comments: 12,
    tag: "General",
  },
  {
    id: 2,
    userId: "u_maica",
    avatar: "MV",
    time: "4h ago",
    content:
      "Anyone else struggling with CMSC 142 finals? The automata theory part is killing me. Study group sa lib mamaya around 6pm? 📚",
    likes: 23,
    comments: 31,
    tag: "Academics",
  },
  {
    id: 3,
    userId: "u_josh",
    avatar: "JR",
    time: "5h ago",
    content: "Hot take: Django > Laravel for our school projects. The ORM alone saves so many headaches. Fight me in the comments.",
    likes: 61,
    comments: 44,
    tag: "Tech",
  },
  {
    id: 4,
    userId: "u_tricia",
    avatar: "TL",
    time: "8h ago",
    content: "CCS Night 2025 planning committee is looking for volunteers! DM me or drop your name in the comments if you're interested 🎉",
    likes: 88,
    comments: 19,
    tag: "Events",
  },
  {
    id: 5,
    userId: "u_miguel",
    avatar: "MS",
    time: "1d ago",
    content: "Reminder that the hackathon registration closes TOMORROW. Team slots are almost full — register at the CCS org office now!",
    likes: 102,
    comments: 7,
    tag: "Events",
  },
];

const MOCK_USERS = {
  u_you: {
    id: "u_you",
    name: "Juan Dela Cruz",
    handle: "juandc",
    status: "Student",
    program: "BS Computer Science",
    year: "3rd Year",
    campus: "Antipolo",
    focus: "HCI",
    bio: "Computer science student building expressive UI systems. Interests: UX engineering, realtime graphics, and app polish.",
    avatarColor: "#9b0028",
    avatarAccent: "#ff6080",
  },
  u_renz: { id: "u_renz", name: "Renz Delos Santos", handle: "renz_ds", status: "Student", program: "BSIT", year: "4th Year", campus: "Antipolo", focus: "Full-stack", bio: "Shipped projects, survived finals, and still here to help the community.", avatarColor: "#9b0028", avatarAccent: "#ff6080" },
  u_maica: { id: "u_maica", name: "Maica Villanueva", handle: "maica_v", status: "Student", program: "BSCS", year: "3rd Year", campus: "Antipolo", focus: "Theory", bio: "Automata enjoyer. Coffee powered. Ask me about CMSC 142.", avatarColor: "#5a0030", avatarAccent: "#ff3a6e" },
  u_josh: { id: "u_josh", name: "Josh Reyes", handle: "joshreyes", status: "Student", program: "BSCS", year: "2nd Year", campus: "Antipolo", focus: "Backend", bio: "Opinionated about frameworks and unapologetic about it.", avatarColor: "#3a0014", avatarAccent: "#ffb0bd" },
  u_tricia: { id: "u_tricia", name: "Tricia Lim", handle: "tricialim", status: "Student", program: "BSIT", year: "3rd Year", campus: "Antipolo", focus: "Community", bio: "If there’s a committee, I’m probably in it.", avatarColor: "#7a0024", avatarAccent: "#ff96a6" },
  u_miguel: { id: "u_miguel", name: "Miguel Santos", handle: "miguels", status: "Student", program: "BSCS", year: "4th Year", campus: "Antipolo", focus: "Security", bio: "Hackathons, deadlines, and security rabbit holes.", avatarColor: "#5a0030", avatarAccent: "#ff6080" },
};

const DEFAULT_PROFILE = {
  id: "u_you",
  name: "Juan Dela Cruz",
  handle: "juandc",
  status: "Student", // Student | Moderator | Admin (gutted: role override)
  program: "BS Computer Science",
  campus: "Antipolo",
  bio: "Computer science student building expressive UI systems.",
};

const DEFAULT_STATE = {
  posts: MOCK_POSTS.map((p) => ({ ...p, userId: p.userId || "u_you", bookmarked: !!p.bookmarked })),
  activities: [],
  friends: { friends: ["u_renz", "u_maica", "u_tricia"], pending: ["u_josh"], outgoing: ["u_miguel"] },
  subs: { tags: [{ tag: "Academics" }, { tag: "Events" }, { tag: "Tech" }], follows: ["u_renz", "u_tricia"] },
  profile: { ...DEFAULT_PROFILE },
  prefs: { largerText: false, reduceMotion: false, defaultPostTag: "General", roleOverride: "" },
};

const STATE_KEYS = {
  posts: "ccs.posts.v1",
  activities: "ccs.activities.v1",
  friends: "ccs.friends.v1",
  subs: "ccs.subs.v1",
  profile: "ccs.profile.v1",
  prefs: "ccs.prefs.v1",
};

function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

const STATE = {
  posts: [],
  activities: [],
  friends: DEFAULT_STATE.friends,
  subs: DEFAULT_STATE.subs,
  profile: DEFAULT_STATE.profile,
  prefs: DEFAULT_STATE.prefs,
};

function hydrateState() {
  STATE.posts = loadJSON(STATE_KEYS.posts, DEFAULT_STATE.posts);
  // Back-compat/migration: ensure required fields exist
  STATE.posts = (STATE.posts || []).map((p) => ({
    bookmarked: false,
    userId: "u_you",
    ...p,
    userId: p.userId || "u_you",
    bookmarked: !!p.bookmarked,
  }));
  STATE.activities = loadJSON(STATE_KEYS.activities, DEFAULT_STATE.activities);
  STATE.friends = loadJSON(STATE_KEYS.friends, DEFAULT_STATE.friends);
  STATE.subs = loadJSON(STATE_KEYS.subs, DEFAULT_STATE.subs);
  STATE.profile = loadJSON(STATE_KEYS.profile, DEFAULT_STATE.profile);
  STATE.prefs = loadJSON(STATE_KEYS.prefs, DEFAULT_STATE.prefs);
}
function persistState() {
  saveJSON(STATE_KEYS.posts, STATE.posts);
  saveJSON(STATE_KEYS.activities, STATE.activities);
  saveJSON(STATE_KEYS.friends, STATE.friends);
  saveJSON(STATE_KEYS.subs, STATE.subs);
  saveJSON(STATE_KEYS.profile, STATE.profile);
  saveJSON(STATE_KEYS.prefs, STATE.prefs);
}

function addActivity(type, meta = {}) {
  STATE.activities.unshift({ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, ts: Date.now(), type, ...meta });
  STATE.activities = STATE.activities.slice(0, 200);
  persistState();
}

const LS_KEYS = {
  mode: "ccs.prefs.v1.mode",
  authed: "ccs.authed.v1",
};

const ROUTES = {
  landing: "#/landing",
  about: "#/about",
  forum: "#/forum",
  search: "#/search",
  profile: "#/profile",
  activities: "#/activities",
  bookmarks: "#/bookmarks",
  friends: "#/friends",
  subs: "#/subs",
  settings: "#/settings",
  admin: "#/admin",
  login: "#/login",
  register: "#/register",
};

function routeToPage(hash) {
  const h = (hash || "").replace(/^#/, "");
  const seg = h.startsWith("/") ? h.slice(1) : h;
  const key = seg.split(/[/?#]/)[0] || "landing";
  // normalize
  if (key === "home") return "landing";
  if (key === "signin") return "login";
  if (key === "signup") return "register";
  return Object.prototype.hasOwnProperty.call(ROUTES, key) ? key : "landing";
}

function setPage(page, { replace = false } = {}) {
  const nextHash = ROUTES[page] || ROUTES.landing;
  if (replace) window.location.replace(nextHash);
  else window.location.hash = nextHash;
  renderRoute(page);
}

function $(sel, root = document) {
  return root.querySelector(sel);
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null) node.setAttribute(k, String(v));
  }
  for (const child of children) node.append(child);
  return node;
}

let miniCloseTimer = null;
function showMiniProfile(userId, anchorRect) {
  const slot = $('[data-slot="mini-profile"]');
  if (!slot) return;
  const u = MOCK_USERS[userId] || MOCK_USERS.u_you;
  slot.hidden = false;

  // Position: right of anchor when possible, otherwise left.
  const pad = 12;
  const w = 320;
  const hGuess = 160;
  const rightX = anchorRect.right + 10;
  const leftX = anchorRect.left - w - 10;
  const x = rightX + w + pad <= window.innerWidth ? rightX : Math.max(pad, leftX);
  const y = Math.min(window.innerHeight - hGuess - pad, Math.max(pad, anchorRect.top - 10));
  slot.style.left = `${Math.round(x)}px`;
  slot.style.top = `${Math.round(y)}px`;

  slot.innerHTML = `
    <div class="ccs-mini-head">
      <div class="ccs-mini-avatar" style="background: linear-gradient(135deg, ${u.avatarAccent || "#ff6080"}, ${u.avatarColor || "#9b0028"});"></div>
      <div style="min-width:0;">
        <div class="ccs-mini-name">${u.name}</div>
        <div class="ccs-mini-handle">@${u.handle}</div>
      </div>
    </div>
    <div class="ccs-mini-meta">${u.status}${u.program ? ` · ${u.program}` : ""}${u.year ? ` · ${u.year}` : ""}</div>
    <div class="ccs-mini-bio">${u.bio || ""}</div>
  `;
}
function scheduleHideMiniProfile() {
  if (miniCloseTimer) window.clearTimeout(miniCloseTimer);
  miniCloseTimer = window.setTimeout(() => {
    const slot = $('[data-slot="mini-profile"]');
    if (slot) slot.hidden = true;
  }, 140);
}
function cancelHideMiniProfile() {
  if (miniCloseTimer) window.clearTimeout(miniCloseTimer);
  miniCloseTimer = null;
}

function getReduceMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  } catch {
    return false;
  }
}

function getMode() {
  const raw = window.localStorage.getItem(LS_KEYS.mode);
  return raw === "light" ? "light" : "dark";
}

function setMode(mode) {
  window.localStorage.setItem(LS_KEYS.mode, mode);
  document.body.classList.toggle("ccs-light", mode === "light");
  document.body.classList.toggle("ccs-dark", mode !== "light");
  document.body.style.background = getComputedStyle(document.body).getPropertyValue("--appBg");
  document.body.style.color = getComputedStyle(document.body).getPropertyValue("--text");

  // Apply font size preference (gutted: global knob)
  document.body.style.fontSize = STATE?.prefs?.largerText ? "16.5px" : "15px";

  const icon = $('[data-slot="mode-icon"]');
  const label = $('[data-slot="mode-label"]');
  if (icon) icon.textContent = mode === "light" ? "☀" : "🌙";
  if (label) label.textContent = mode === "light" ? "Light mode" : "Dark mode";
}

function getAuthed() {
  return window.localStorage.getItem(LS_KEYS.authed) === "true";
}

function setAuthed(next) {
  window.localStorage.setItem(LS_KEYS.authed, next ? "true" : "false");
  addActivity(next ? "sign_in" : "sign_out");
  renderAuthUI();
}

function renderAuthUI() {
  const isAuthed = getAuthed();

  const navSlot = $('[data-slot="auth-actions"]');
  if (navSlot) {
    navSlot.innerHTML = "";
    if (isAuthed) {
      navSlot.append(
        el("button", { class: "ccs-btn ccs-btn-solid", dataset: { action: "go-forum" }, type: "button" }, ["Open forum"])
      );
      navSlot.append(el("button", { class: "ccs-btn", dataset: { action: "sign-out" }, type: "button" }, ["Sign out"]));
    } else {
      navSlot.append(el("button", { class: "ccs-btn", dataset: { action: "sign-in" }, type: "button" }, ["Sign in"]));
      navSlot.append(
        el("button", { class: "ccs-btn ccs-btn-solid ccs-hide-mobile", dataset: { action: "register" }, type: "button" }, [
          "Create account",
        ])
      );
    }
  }

  const heroCtas = $('[data-slot="hero-ctas"]');
  if (heroCtas) {
    heroCtas.innerHTML = "";
    if (isAuthed) {
      heroCtas.append(
        el("button", { class: "ccs-btn ccs-btn-solid ccs-btn-lg", dataset: { action: "go-forum" }, type: "button" }, [
          "Open the forum →",
        ])
      );
    } else {
      heroCtas.append(
        el("button", { class: "ccs-btn ccs-btn-solid ccs-btn-lg", dataset: { action: "register" }, type: "button" }, [
          "Create your account",
        ])
      );
      heroCtas.append(
        el("button", { class: "ccs-btn ccs-btn-ghost ccs-btn-lg", dataset: { action: "sign-in" }, type: "button" }, [
          "I already have an account",
        ])
      );
    }
  }

  const previewNote = $('[data-slot="preview-note"]');
  if (previewNote) {
    previewNote.innerHTML = "";
    if (isAuthed) {
      previewNote.textContent = "Open the forum to keep reading.";
    } else {
      const btn = el(
        "button",
        { type: "button", class: "ccs-nav-link", dataset: { action: "sign-in" }, style: "display:inline; padding:0; font-size:13px;" },
        ["Sign in"]
      );
      previewNote.append(btn);
      previewNote.append(" to view all threads, post, and join the conversation.");
    }
  }

  const footerCta = $('[data-slot="footer-cta"]');
  if (footerCta) {
    footerCta.innerHTML = "";
    if (!isAuthed) {
      footerCta.append(el("button", { class: "ccs-btn ccs-btn-solid ccs-btn-lg", dataset: { action: "register" }, type: "button" }, ["Sign up"]));
    }
    footerCta.append(
      el("button", { class: "ccs-btn ccs-btn-ghost ccs-btn-lg", dataset: { action: "go-forum" }, type: "button" }, [
        isAuthed ? "Open forum" : "Browse as guest",
      ])
    );
  }
}

function renderStaticContent() {
  document.title = `${APP_CONFIG.brand.name} (Static)`;
  const brand = $(".ccs-brand");
  if (brand) brand.textContent = APP_CONFIG.brand.name;
  const heroTitle = $(".ccs-hero-title");
  if (heroTitle) heroTitle.textContent = APP_CONFIG.brand.name;
  const subtitle = $(".ccs-hero-subtitle");
  if (subtitle) subtitle.textContent = APP_CONFIG.landing.heroSubtitle;
  const footerBrand = $(".ccs-footer-brand");
  if (footerBrand) footerBrand.textContent = APP_CONFIG.brand.name;
  const footerOrg = $(".ccs-footer-org");
  if (footerOrg) footerOrg.textContent = APP_CONFIG.brand.org;
  const footerBottom = $(".ccs-footer-bottom");
  if (footerBottom) footerBottom.textContent = APP_CONFIG.landing.footer.copyright;

  // Stats
  const statsSlot = $('[data-slot="stats"]');
  if (statsSlot) {
    statsSlot.innerHTML = "";
    const allStats = [...APP_CONFIG.landing.stats, { k: "Posts published", v: String(STATE.posts.length) }];
    for (const s of allStats) {
      statsSlot.append(
        el("div", { class: "ccs-card ccs-stat" }, [
          el("div", { class: "ccs-stat-k" }, [s.k]),
          el("div", { class: "ccs-stat-v" }, [s.v]),
        ])
      );
    }
  }

  // Feature cards
  const featureSlot = $('[data-slot="feature-cards"]');
  if (featureSlot) {
    featureSlot.innerHTML = "";
    APP_CONFIG.landing.featureCards.forEach((c) => {
      featureSlot.append(
        el("div", { class: "ccs-card ccs-feature", dataset: { anim: "feature" } }, [
          el("div", { class: "ccs-feature-icon" }, [c.icon]),
          el("div", { class: "ccs-feature-title" }, [c.title]),
          el("div", { class: "ccs-feature-body" }, [c.body]),
        ])
      );
    });
  }

  // How it works
  const stepsSlot = $('[data-slot="steps"]');
  if (stepsSlot) {
    const steps = [
      { n: "01", t: "Sign in with your CCS email", b: "Use your @student.fatima.edu.ph or @fatima.edu.ph address. Mods keep things kind." },
      { n: "02", t: "Subscribe to tags & people", b: "Follow #Academics or your favorite organizers — your feed stays focused." },
      { n: "03", t: "Post, message, organize", b: "Threads, study circles, event sign-ups, and bookmarks live in one place." },
    ];
    stepsSlot.innerHTML = "";
    steps.forEach((s) => {
      stepsSlot.append(
        el("div", { class: "ccs-card ccs-step", dataset: { anim: "step" } }, [
          el("div", { class: "ccs-step-n" }, [s.n]),
          el("div", { class: "ccs-step-t" }, [s.t]),
          el("div", { class: "ccs-step-b" }, [s.b]),
        ])
      );
    });
  }

  // Orgs
  const orgSlot = $('[data-slot="orgs"]');
  if (orgSlot) {
    orgSlot.innerHTML = "";
    APP_CONFIG.landing.community.orgs.forEach((o) => {
      const badge = el("div", {
        class: "ccs-org-badge",
        style: `background: linear-gradient(135deg, ${o.accent}, ${o.color});`,
      });
      const tags = el("div", { class: "ccs-tags" }, o.tags.map((t) => el("span", { class: "ccs-tag" }, [`#${t}`])));
      orgSlot.append(
        el("article", { class: "ccs-card ccs-org", dataset: { anim: "org" } }, [
          el("div", { class: "ccs-org-head" }, [
            badge,
            el("div", {}, [
              el("div", { class: "ccs-org-name" }, [o.name]),
              el("div", { class: "ccs-org-meta" }, [`${o.kind} · ${o.members} members`]),
            ]),
          ]),
          el("div", { class: "ccs-org-body" }, [o.body]),
          tags,
        ])
      );
    });
  }

  // Events
  const eventsSlot = $('[data-slot="events"]');
  if (eventsSlot) {
    eventsSlot.innerHTML = "";
    APP_CONFIG.landing.community.events.forEach((ev) => {
      eventsSlot.append(
        el("div", { class: "ccs-card ccs-event" }, [
          el("div", { class: "ccs-event-head" }, [
            el("div", { class: "ccs-event-title" }, [ev.title]),
            el("div", { class: "ccs-event-when" }, [ev.when]),
          ]),
          el("div", { class: "ccs-event-body" }, [ev.body]),
          el("div", { class: "ccs-event-where" }, [`📍 ${ev.where}`]),
        ])
      );
    });
  }

  // Footer columns
  const footerCols = $('[data-slot="footer-cols"]');
  if (footerCols) {
    footerCols.innerHTML = "";
    APP_CONFIG.landing.footer.columns.forEach((col) => {
      footerCols.append(
        el("div", {}, [
          el("div", { class: "ccs-footer-colgroup-title" }, [col.title.toUpperCase()]),
          el("div", { class: "ccs-footer-links" }, col.links.map((x) => el("div", { class: "ccs-footer-link" }, [x]))),
        ])
      );
    });
  }

  // Preview feed
  const preview = $('[data-slot="preview-posts"]');
  if (preview) {
    preview.innerHTML = "";
    STATE.posts.slice(0, 3).forEach((p) => {
      preview.append(
        el("div", { class: "ccs-card ccs-preview-card" }, [
          el("div", { class: "ccs-preview-meta" }, [
            el("span", { class: "ccs-avatar-dot", "aria-hidden": "true" }),
            el("span", { class: "ccs-preview-user" }, [p.avatar]),
            el("span", {}, [`· ${p.time}`]),
            el("span", { class: "ccs-preview-tag" }, [p.tag]),
          ]),
          el("div", { class: "ccs-preview-content" }, [p.content]),
          el("div", { class: "ccs-preview-footer" }, [`♥ ${p.likes} · 💬 ${p.comments}`]),
        ])
      );
    });
  }
}

function installActions() {
  document.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target.closest("[data-action]") : null;
    const action = target?.getAttribute("data-action");
    if (!action) return;

    if (action === "toggle-mode") {
      const next = getMode() === "light" ? "dark" : "light";
      setMode(next);
      renderRoute(routeToPage(window.location.hash));
      return;
    }

    if (action === "scroll-community") {
      $("#community")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action === "sign-in" || action === "go-login") return setPage("login");
    if (action === "register" || action === "go-register") return setPage("register");
    if (action === "sign-out") {
      setAuthed(false);
      return setPage("landing");
    }

    if (action === "apply") {
      // In the full app this would open a form; here we just route to auth.
      if (!getAuthed()) return setPage("register");
      $("#community")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action === "go-forum") {
      return setPage("forum");
    }
    if (action === "go-about") {
      return setPage("about");
    }
    if (action === "go-landing") {
      return setPage("landing");
    }

    if (action === "sidebar-open") {
      $('[data-slot="sidebar"]')?.classList.add("is-open");
      $('[data-slot="sidebar-backdrop"]')?.classList.add("is-open");
      return;
    }
    if (action === "sidebar-close") {
      $('[data-slot="sidebar"]')?.classList.remove("is-open");
      $('[data-slot="sidebar-backdrop"]')?.classList.remove("is-open");
      return;
    }

    if (action === "go") {
      const page = target?.getAttribute("data-page");
      if (page === "landing") {
        setAuthed(false);
        setPage("landing");
      } else if (page) {
        setPage(page);
      }
      $('[data-slot="sidebar"]')?.classList.remove("is-open");
      $('[data-slot="sidebar-backdrop"]')?.classList.remove("is-open");
      return;
    }

    if (action === "forum-set-tag") {
      const tag = target?.getAttribute("data-tag") || "All";
      window.sessionStorage.setItem("ccs.forum.activeTag", tag);
      window.sessionStorage.setItem(`ccs.forum.visible.${tag}`, getAuthed() ? "8" : "3");
      window.sessionStorage.setItem(`ccs.forum.caughtUp.${tag}`, "false");
      renderForumScreen();
      return;
    }

    if (action === "forum-publish") {
      if (!getAuthed()) return setPage("login");
      const root = $('[data-screen="forum"]');
      const draft = root ? $('[data-slot="forum-draft"]', root) : null;
      const text = draft && "value" in draft ? String(draft.value || "") : "";
      if (!text.trim()) return;
      const tag = STATE.prefs.defaultPostTag || "General";
      STATE.posts.unshift({
        id: Date.now(),
      userId: "u_you",
        avatar: "ME",
        time: "Just now",
        content: text.trim(),
        likes: 0,
        comments: 0,
        tag,
        bookmarked: false,
      });
      persistState();
      addActivity("publish_post");
      if (draft) draft.value = "";
      renderForumScreen();
      return;
    }

    if (action === "forum-share") {
      const postId = target?.getAttribute("data-post-id") || "";
      const url = `${window.location.origin}${window.location.pathname}#/forum?post=${encodeURIComponent(postId)}`;
      navigator.clipboard?.writeText?.(url).catch(() => {});
      return;
    }

    if (action === "forum-like") {
      if (!getAuthed()) return setPage("login");
      const postId = Number(target?.getAttribute("data-post-id") || 0);
      const p = STATE.posts.find((x) => x.id === postId);
      if (p) p.likes += 1;
      persistState();
      addActivity("like_post", { postId });
      renderForumScreen();
      return;
    }

    if (action === "forum-bookmark") {
      if (!getAuthed()) return setPage("login");
      const postId = Number(target?.getAttribute("data-post-id") || 0);
      const p = STATE.posts.find((x) => x.id === postId);
      if (p) p.bookmarked = !p.bookmarked;
      persistState();
      addActivity("bookmark_post", { postId });
      renderForumScreen();
      return;
    }

    if (action === "forum-load-more") {
      const tag = window.sessionStorage.getItem("ccs.forum.activeTag") || "All";
      requestLoadMore(tag);
      return;
    }
  });

  // Hover mini profile preview
  document.addEventListener("mouseover", (e) => {
    const target = e.target instanceof Element ? e.target.closest('[data-action="user-preview"]') : null;
    if (!target) return;
    cancelHideMiniProfile();
    const userId = target.getAttribute("data-user-id") || "u_you";
    const rect = target.getBoundingClientRect();
    showMiniProfile(userId, rect);
  });
  document.addEventListener("mouseout", (e) => {
    const target = e.target instanceof Element ? e.target.closest('[data-action="user-preview"]') : null;
    if (target) scheduleHideMiniProfile();
  });

  const mini = $('[data-slot="mini-profile"]');
  mini?.addEventListener("mouseenter", cancelHideMiniProfile);
  mini?.addEventListener("mouseleave", scheduleHideMiniProfile);

  // Accessibility: allow "click" on brand via Enter/Space.
  const brand = $(".ccs-brand");
  brand?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

function applyLowPowerClass() {
  const cores = navigator.hardwareConcurrency || 8;
  const mem = navigator.deviceMemory || 8;
  const conn = navigator.connection?.effectiveType;
  const slowNet = conn === "slow-2g" || conn === "2g" || conn === "3g";
  const small = window.innerWidth <= 720;
  const reduce = getReduceMotion();
  const lowEnd = reduce || cores <= 4 || mem <= 4 || slowNet || small;
  document.body.classList.toggle("ccs-low-power", lowEnd);
}

function mountScreensOnce() {
  const landing = $('[data-screen="landing"]');
  const about = $('[data-screen="about"]');
  const auth = $('[data-screen="auth"]');
  const forum = $('[data-screen="forum"]');

  if (landing && landing.childElementCount === 0) {
    landing.innerHTML = `
      <section class="ccs-hero">
        <div class="ccs-stack-tablet ccs-hero-grid">
          <div>
            <div class="ccs-kicker">OLFU · COLLEGE OF COMPUTER STUDIES</div>
            <h1 class="ccs-hero-title" data-anim="hero">CCS Talks</h1>
            <p class="ccs-hero-subtitle" data-anim="subtitle">
              Announcements, threads, study circles, and community events—fast, searchable, and beautifully organized.
            </p>

            <div class="ccs-hero-ctas" data-anim="cta">
              <div data-slot="hero-ctas"></div>
              <button class="ccs-btn ccs-btn-ghost ccs-btn-lg" data-action="go-forum" type="button">Browse as guest</button>
            </div>

            <div class="ccs-stats" data-slot="stats"></div>
          </div>

          <aside class="ccs-live-preview" aria-label="Live sample feed">
            <div class="ccs-live-preview-head">
              <div class="ccs-kicker">LIVE · SAMPLE FEED</div>
              <button class="ccs-btn ccs-btn-ghost ccs-btn-xs" data-action="go-forum" type="button">Peek →</button>
            </div>
            <div data-slot="preview-posts" class="ccs-preview-list"></div>
            <div class="ccs-dashed-note" data-slot="preview-note"></div>
          </aside>
        </div>
      </section>

      <section class="ccs-section">
        <div class="ccs-features" data-slot="feature-cards"></div>
      </section>

      <section class="ccs-section">
        <div class="ccs-section-kicker">HOW IT WORKS</div>
        <div class="ccs-stack-mobile ccs-steps" data-slot="steps"></div>
      </section>

      <section class="ccs-section" id="community">
        <div class="ccs-section-kicker">COMMUNITY</div>
        <h2 class="ccs-community-title">The orgs, events, and circles that make CCS, CCS.</h2>

        <div class="ccs-orgs" data-slot="orgs"></div>

        <div class="ccs-section-kicker" style="margin-top: 18px;">UPCOMING</div>
        <div class="ccs-events" data-slot="events"></div>

        <div class="ccs-apply">
          <div>
            <div class="ccs-apply-title">Run an org or a circle?</div>
            <div class="ccs-apply-body">Apply for an Organizer badge — get pinning, scheduled posts, and event boosts.</div>
          </div>
          <button class="ccs-btn ccs-btn-solid" data-action="apply" type="button">Apply</button>
        </div>
      </section>

      <section class="ccs-section">
        <div class="ccs-cta">
          <div>
            <div class="ccs-cta-title">Ready to join the conversation?</div>
            <div class="ccs-cta-body">Free for any verified OLFU CCS student.</div>
          </div>
          <div class="ccs-cta-actions" data-slot="footer-cta"></div>
        </div>
      </section>

      <footer class="ccs-footer">
        <div class="ccs-stack-mobile ccs-footer-grid">
          <div>
            <div class="ccs-footer-brand">CCS Talks</div>
            <div class="ccs-footer-desc">Built for CCS students — threads, resources, and campus life in one place.</div>
            <div class="ccs-footer-org">GROUP 4™</div>
          </div>
          <div class="ccs-footer-col" data-slot="footer-cols"></div>
        </div>
        <div class="ccs-footer-bottom">© 2026 CCS Talks</div>
      </footer>
    `;
  }

  if (about && about.childElementCount === 0) {
    about.innerHTML = `
      <div style="min-height: calc(100vh - 68px); display:flex; flex-direction:column; justify-content:center; align-items:center; padding: 24px; text-align:center;">
        <div style="width:72px; height:72px; border-radius:50%; border:2px solid rgba(255,255,255,0.3); margin: 0 auto 2rem; display:flex; align-items:center; justify-content:center;">
          <div style="font-size:34px;">⚜</div>
        </div>
        <h1 style="font-weight:950; font-size: clamp(3rem, 8vw, 7rem); color: var(--textStrong); letter-spacing:-2px; margin:0;">CCS Talks</h1>
        <p style="color: var(--textSubtle); margin-top: 16px; font-size:16px;">All rights reserved.</p>
        <div style="margin-top: 3rem; max-width: 680px; width:100%; display:flex; flex-direction:column; gap: 10px;">
          <div class="ccs-card" style="padding: 1.25rem; text-align:left;">
            <div style="font-weight:800; color: var(--textStrong); margin-bottom:6px;">Our Community</div>
            <div style="color: var(--textMuted); line-height:1.6; font-size:14px;">CCS Talks is the dedicated digital forum for students, faculty, and alumni of the OLFU College of Computer Studies. A space to discuss, collaborate, and connect.</div>
          </div>
          <div class="ccs-card" style="padding: 1.25rem; text-align:left;">
            <div style="font-weight:800; color: var(--textStrong); margin-bottom:6px;">Our Mission</div>
            <div style="color: var(--textMuted); line-height:1.6; font-size:14px;">To foster a vibrant tech community within OLFU-CCS, empowering members to share knowledge, explore ideas, and build lasting connections.</div>
          </div>
          <div class="ccs-card" style="padding: 1.25rem; text-align:left;">
            <div style="font-weight:800; color: var(--textStrong); margin-bottom:6px;">Made by</div>
            <div style="color: var(--textMuted); line-height:1.6; font-size:14px;">GROUP 4™ — a student creative collective dedicated to building meaningful digital experiences for the CCS community.</div>
          </div>
        </div>
      </div>
    `;
  }

  if (auth && auth.childElementCount === 0) {
    auth.innerHTML = `
      <div class="ccs-stack-tablet" style="min-height: calc(100vh - 68px); display:grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);">
        <aside class="ccs-hide-tablet" style="display:flex; flex-direction:column; justify-content:center; padding: 2rem 3rem;">
          <div style="max-width:520px;">
            <div style="font-size:13px; font-weight:800; letter-spacing:0.18em; color: var(--textMuted);">${APP_CONFIG.brand.name.toUpperCase()}</div>
            <h1 style="font-size:40px; line-height:1.05; font-weight:950; letter-spacing:-1px; margin:10px 0 14px; color: var(--textStrong);" data-slot="auth-head">Welcome back.</h1>
            <p style="font-size:16px; color: var(--textMuted); margin:0; line-height:1.55;" data-slot="auth-sub">
              Pick up the conversation, reopen your bookmarks, and catch up on the threads you follow.
            </p>
          </div>
        </aside>
        <div style="display:flex; align-items:center; justify-content:center; padding: 2rem 1rem 3rem;">
          <form class="ccs-card" data-slot="auth-card" style="width:100%; max-width:440px; padding: 1.75rem; opacity: 1;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 6px;">
              <div style="font-size:11px; font-weight:800; letter-spacing:0.2em; color: var(--textMuted);" data-slot="auth-kicker">SIGN IN</div>
              <div style="display:flex; gap:4px; padding:4px; border-radius:999px; border:1px solid var(--border); background: var(--surfaceAlt);">
                <button type="button" class="ccs-btn" style="padding:6px 10px; border-radius:999px;" data-action="go-login">Sign in</button>
                <button type="button" class="ccs-btn" style="padding:6px 10px; border-radius:999px;" data-action="go-register">Sign up</button>
              </div>
            </div>
            <div style="font-size:22px; font-weight:950; color: var(--textStrong); letter-spacing:-0.4px; margin-top: 10px;" data-slot="auth-title">Sign in to CCS Talks</div>
            <div style="font-size:13px; color: var(--textMuted); margin-top: 2px;" data-slot="auth-help">Use your forum email and password.</div>

            <div style="margin-top: 14px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <button type="button" class="ccs-btn">Continue with Google</button>
              <button type="button" class="ccs-btn">Continue with Fatima SSO</button>
            </div>

            <div style="display:flex; align-items:center; gap:10px; margin:14px 0; color: var(--textMuted); font-size:11px; font-weight:800; letter-spacing:0.16em;">
              <span style="flex:1; height:1px; background: var(--divider);"></span>OR<span style="flex:1; height:1px; background: var(--divider);"></span>
            </div>

            <div data-slot="auth-fields"></div>

            <div data-slot="auth-error" style="margin-top: 10px; color: #ff7d99; font-size: 12px; font-weight: 800; display:none;"></div>

            <button type="submit" class="ccs-btn ccs-btn-solid ccs-btn-lg" style="width:100%; margin-top: 14px;" data-slot="auth-submit">Sign in</button>
            <p style="text-align:center; margin-top: 14px; font-size: 13px; color: var(--textMuted);">
              <span data-slot="auth-switch-text">New to CCS Talks?</span>
              <button type="button" class="ccs-nav-link" style="display:inline; padding:0; font-size:13px;" data-slot="auth-switch-btn" data-action="go-register">Create an account</button>
            </p>
            <p style="text-align:center; margin-top: 6px; font-size: 12px; color: var(--textSubtle);">
              <button type="button" class="ccs-nav-link" style="display:inline; padding:0; font-size:12px; text-decoration: underline;" data-action="go-forum">Continue as guest</button>
            </p>
          </form>
        </div>
      </div>
    `;
  }

  if (forum && forum.childElementCount === 0) {
    forum.innerHTML = `
      <div data-slot="forum-feed" class="ccs-scroll"
        style="
          position: fixed;
          top: 0;
          left: var(--ccs-shell-left);
          right: 0;
          bottom: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1.75rem var(--ccs-shell-pad-x) 2.5rem;
          border-left: 1px solid var(--divider);
        "
      >
        <div style="max-width: 760px; margin: 0 auto;">
          <div data-slot="forum-guest-banner"></div>

          <div data-slot="forum-tags" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom: 10px;"></div>

          <div class="ccs-card" data-slot="forum-compose" style="display:flex; align-items:center; gap: 12px; padding: 12px 14px; border-radius: 18px; margin-bottom: 1.2rem; opacity: 1;">
            <input data-slot="forum-draft" placeholder="What's on your mind?" style="flex:1; background:none; border:none; outline:none; color: var(--text); font-size: 14px;" />
            <button class="ccs-btn ccs-btn-solid" type="button" data-action="forum-publish">Publish</button>
          </div>

          <div data-slot="forum-posts" style="display:flex; flex-direction:column; gap: 1rem;"></div>
          <div data-slot="forum-load-more" style="margin-top: 1rem;"></div>
        </div>
      </div>
    `;
  }
}

function animateIn() {
  const reduce = getReduceMotion();

  const hero = $('[data-anim="hero"]');
  const subtitle = $('[data-anim="subtitle"]');
  const cta = $('[data-anim="cta"]');
  const features = Array.from(document.querySelectorAll('[data-anim="feature"]'));
  const steps = Array.from(document.querySelectorAll('[data-anim="step"]'));
  const orgs = Array.from(document.querySelectorAll('[data-anim="org"]'));

  // Defensive: if GSAP never loads, unhide everything (matches React version’s intent).
  const failSafe = window.setTimeout(() => {
    if (window.gsap) return;
    [hero, subtitle, cta, ...features, ...steps, ...orgs].forEach((node) => {
      if (node instanceof HTMLElement) node.style.opacity = "1";
    });
  }, 1500);

  if (reduce || !window.gsap) {
    window.clearTimeout(failSafe);
    [hero, subtitle, cta, ...features, ...steps, ...orgs].forEach((node) => {
      if (node instanceof HTMLElement) node.style.opacity = "1";
    });
    return;
  }

  window.clearTimeout(failSafe);
  const gsap = window.gsap;
  gsap.fromTo(hero, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.85, ease: "back.out(1.4)" });
  gsap.fromTo(subtitle, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.18, ease: "back.out(1.2)" });
  gsap.fromTo(cta, { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.65, delay: 0.32, ease: "back.out(1.6)" });
  if (features.length) {
    gsap.fromTo(features, { opacity: 0, y: 22, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)", delay: 0.4, stagger: 0.08 });
  }
  if (steps.length) {
    gsap.fromTo(steps, { opacity: 0, y: 18, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.4)", delay: 0.6, stagger: 0.07 });
  }
  if (orgs.length) {
    gsap.fromTo(orgs, { opacity: 0, y: 16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.5)", delay: 0.05, stagger: 0.05 });
  }
}

function renderSidebar(activeKey) {
  const slot = $('[data-slot="sidebar"]');
  if (!slot) return;
  const isLight = getMode() === "light";
  slot.innerHTML = "";

  const head = el("div", { style: "display:flex; align-items:center; justify-content:space-between; margin-bottom: 1.25rem;" }, [
    el("span", { class: "ccs-brand", dataset: { action: "go-landing" }, style: `font-size:22px;` }, [APP_CONFIG.brand.name]),
    el("button", { type: "button", class: "ccs-pill", dataset: { action: "toggle-mode" }, title: "Toggle theme" }, [isLight ? "☀" : "🌙"]),
  ]);

  slot.append(
    el(
      "div",
      {
        style: `
          width: 280px;
          height: 100vh;
          background: ${isLight ? "rgba(255,255,255,0.92)" : "rgba(30,0,12,0.92)"};
          backdrop-filter: blur(12px);
          border-right: 1px solid ${isLight ? "rgba(60,0,20,0.14)" : "var(--divider)"};
          display:flex;
          flex-direction:column;
          padding: 1.25rem 1.5rem 2rem;
          color: ${isLight ? "#2a0010" : "#f4ecec"};
        `,
      },
      [
        head,
        el("div", { style: `border-bottom: 1px solid ${isLight ? "rgba(60,0,20,0.10)" : "var(--divider)"}; margin-bottom: 1.25rem;` }),
        el(
          "div",
          { style: "flex:1;" },
          APP_CONFIG.nav.sidebarPrimary.map((x) =>
            el(
              "div",
              {
                dataset: { action: "go", page: x.key },
                style: `
                  display:flex;
                  align-items:center;
                  gap:12px;
                  padding: 10px 14px;
                  border-radius: 12px;
                  cursor: pointer;
                  margin-bottom: 2px;
                  background: ${
                    x.key === activeKey
                      ? isLight
                        ? "linear-gradient(90deg, rgba(192,0,42,0.18), rgba(192,0,42,0.04))"
                        : "linear-gradient(90deg, rgba(160,0,40,0.55), rgba(160,0,40,0.15))"
                      : "transparent"
                  };
                  color: ${
                    x.key === activeKey ? (isLight ? "#1a0008" : "#fff") : isLight ? "rgba(60,0,20,0.78)" : "rgba(240,200,200,0.78)"
                  };
                  font-weight: ${x.key === activeKey ? 700 : 500};
                  font-size: 15px;
                `,
              },
              [el("span", { style: "font-size:16px; width:18px; text-align:center;" }, [x.icon]), document.createTextNode(x.label)]
            )
          )
        ),
        el(
          "div",
          { style: `border-top: 1px solid ${isLight ? "rgba(60,0,20,0.10)" : "var(--divider)"}; padding-top: 1rem;` },
          APP_CONFIG.nav.sidebarSecondary.map((x) =>
            el(
              "div",
              {
                dataset: { action: "go", page: x.key },
                style: `
                  display:flex;
                  align-items:center;
                  gap:12px;
                  padding: 10px 14px;
                  border-radius: 12px;
                  cursor: pointer;
                  color: ${isLight ? "rgba(60,0,20,0.65)" : "rgba(240,200,200,0.65)"};
                  font-size: 15px;
                `,
              },
              [el("span", { style: "font-size:16px; width:18px; text-align:center;" }, [x.icon]), document.createTextNode(x.label)]
            )
          )
        ),
        el("span", { style: `font-style: italic; font-weight: 800; font-size: 11px; color: ${isLight ? "rgba(60,0,20,0.35)" : "rgba(255,255,255,0.2)"}; margin-top: 1.5rem; letter-spacing: 1px;` }, [
          APP_CONFIG.brand.org,
        ]),
      ]
    )
  );
}

function renderAuthScreen(mode) {
  const root = $('[data-screen="auth"]');
  if (!root) return;
  const isLogin = mode === "login";
  const head = $('[data-slot="auth-head"]', root);
  const sub = $('[data-slot="auth-sub"]', root);
  const kicker = $('[data-slot="auth-kicker"]', root);
  const title = $('[data-slot="auth-title"]', root);
  const help = $('[data-slot="auth-help"]', root);
  const fields = $('[data-slot="auth-fields"]', root);
  const submit = $('[data-slot="auth-submit"]', root);
  const switchText = $('[data-slot="auth-switch-text"]', root);
  const switchBtn = $('[data-slot="auth-switch-btn"]', root);
  const errBox = $('[data-slot="auth-error"]', root);

  if (head) head.textContent = isLogin ? "Welcome back." : "Build your CCS profile.";
  if (sub) {
    sub.textContent = isLogin
      ? "Pick up the conversation, reopen your bookmarks, and catch up on the threads you follow."
      : "Join the community: post threads, follow tags, drop into study circles, and message classmates.";
  }
  if (kicker) kicker.textContent = isLogin ? "SIGN IN" : "CREATE ACCOUNT";
  if (title) title.textContent = isLogin ? "Sign in to CCS Talks" : "Create your CCS Talks account";
  if (help) help.textContent = isLogin ? "Use your forum email and password." : "Takes about 30 seconds.";
  if (submit) submit.textContent = isLogin ? "Sign in" : "Create account";
  if (switchText) switchText.textContent = isLogin ? "New to CCS Talks? " : "Already have an account? ";
  if (switchBtn) {
    switchBtn.textContent = isLogin ? "Create an account" : "Sign in";
    switchBtn.setAttribute("data-action", isLogin ? "go-register" : "go-login");
  }

  if (fields) {
    fields.innerHTML = "";
    if (!isLogin) {
      fields.append(
        el("label", { style: "display:block; margin-bottom: 12px;" }, [
          el("div", { style: "color: var(--text); font-weight:800; font-size:13px; margin-bottom:6px;" }, ["Full name"]),
          el("input", { type: "text", name: "name", placeholder: "e.g. Juan Dela Cruz", style: "width:100%; box-sizing:border-box; background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 11px 14px; color: var(--text); font-size: 14px; outline:none;" }),
        ])
      );
    }
    fields.append(
      el("label", { style: "display:block; margin-bottom: 12px;" }, [
        el("div", { style: "color: var(--text); font-weight:800; font-size:13px; margin-bottom:6px;" }, ["School email"]),
        el("input", { type: "email", name: "email", placeholder: "you@student.fatima.edu.ph", autocomplete: "email", style: "width:100%; box-sizing:border-box; background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 11px 14px; color: var(--text); font-size: 14px; outline:none;" }),
        el("div", { style: "margin-top: 4px; font-size: 11px; color: var(--textSubtle);" }, ["Use ", el("b", {}, ["@student.fatima.edu.ph"]), " or ", el("b", {}, ["@fatima.edu.ph"]), "."]),
      ])
    );
    fields.append(
      el("label", { style: "display:block; margin-bottom: 12px;" }, [
        el("div", { style: "color: var(--text); font-weight:800; font-size:13px; margin-bottom:6px;" }, ["Password"]),
        el("input", { type: "password", name: "password", autocomplete: isLogin ? "current-password" : "new-password", style: "width:100%; box-sizing:border-box; background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 11px 14px; color: var(--text); font-size: 14px; outline:none;" }),
      ])
    );
    if (!isLogin) {
      fields.append(
        el("label", { style: "display:block; margin-bottom: 12px;" }, [
          el("div", { style: "color: var(--text); font-weight:800; font-size:13px; margin-bottom:6px;" }, ["Confirm password"]),
          el("input", { type: "password", name: "confirm", autocomplete: "new-password", style: "width:100%; box-sizing:border-box; background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 11px 14px; color: var(--text); font-size: 14px; outline:none;" }),
        ])
      );
      fields.append(
        el("label", { style: "display:flex; align-items:flex-start; gap: 8px; margin-top: 4px; font-size: 12px; color: var(--textMuted);" }, [
          el("input", { type: "checkbox", name: "agree", style: "margin-top: 2px;" }),
          el("span", {}, ["I agree to the ", el("span", { style: "color: var(--accent); font-weight: 800;" }, ["Community Guidelines"]), " and the ", el("span", { style: "color: var(--accent); font-weight: 800;" }, ["Privacy notice"]), "."]),
        ])
      );
    }
  }

  const form = $('[data-slot="auth-card"]', root);
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form) return;
    if (!errBox) return;
    errBox.style.display = "none";
    errBox.textContent = "";

    const fd = new FormData(form);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const name = String(fd.get("name") || "");
    const confirm = String(fd.get("confirm") || "");
    const agree = fd.get("agree") === "on";

    const validEmail = /^[^\s@]+@[^\s@]+$/.test(email);
    if (!email || !validEmail) return showAuthErr("Please enter a valid email.");
    if (!isLogin && !/@(student\.)?fatima\.edu\.ph$/i.test(email)) return showAuthErr("Use your @student.fatima.edu.ph or @fatima.edu.ph email.");
    if (!password) return showAuthErr("Please enter a password.");
    if (!isLogin) {
      if (!name.trim()) return showAuthErr("Please enter your full name.");
      if (password.length < 8) return showAuthErr("Password should be at least 8 characters.");
      if (password !== confirm) return showAuthErr("Passwords don't match.");
      if (!agree) return showAuthErr("Please agree to the Community Guidelines.");
    }

    setAuthed(true);
    setPage("forum");

    function showAuthErr(msg) {
      errBox.textContent = msg;
      errBox.style.display = "block";
    }
  });
}

function renderForumScreen() {
  const root = $('[data-screen="forum"]');
  if (!root) return;
  const isAuthed = getAuthed();
  const tagsSlot = $('[data-slot="forum-tags"]', root);
  const banner = $('[data-slot="forum-guest-banner"]', root);
  const postsSlot = $('[data-slot="forum-posts"]', root);
  const draft = $('[data-slot="forum-draft"]', root);
  const compose = $('[data-slot="forum-compose"]', root);
  const loadMoreSlot = $('[data-slot="forum-load-more"]', root);
  const feed = $('[data-slot="forum-feed"]', root);

  const activeTag = window.sessionStorage.getItem("ccs.forum.activeTag") || "All";
  const pageSize = 8;
  const visibleKey = `ccs.forum.visible.${activeTag}`;
  const visibleDefault = isAuthed ? pageSize : 3;
  const visibleCount = Number(window.sessionStorage.getItem(visibleKey) || visibleDefault);
  const loadingMore = window.sessionStorage.getItem("ccs.forum.loadingMore") === "true";
  const caughtUp = window.sessionStorage.getItem(`ccs.forum.caughtUp.${activeTag}`) === "true";

  if (banner) {
    banner.innerHTML = "";
    if (!isAuthed) {
      banner.append(
        el("div", { class: "ccs-card", style: "margin-bottom: 14px; padding: 12px 14px; border-radius: 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;" }, [
          el("div", {}, [
            el("div", { style: "font-weight: 900; color: var(--textStrong);" }, ["You're browsing as a guest."]),
            el("div", { style: "color: var(--textMuted); margin-top: 2px; font-size: 13px;" }, ["Sign in to post, like, bookmark, or comment."]),
          ]),
          el("div", { style: "display:flex; gap: 8px;" }, [
            el("button", { type: "button", class: "ccs-btn ccs-btn-solid", dataset: { action: "go-login" } }, ["Sign in"]),
            el("button", { type: "button", class: "ccs-btn", dataset: { action: "go-register" } }, ["Create account"]),
          ]),
        ])
      );
    }
  }

  if (tagsSlot) {
    tagsSlot.innerHTML = "";
    ["All", "General", "Academics", "Tech", "Events"].forEach((t) => {
      const active = t === activeTag;
      tagsSlot.append(
        el(
          "button",
          {
            type: "button",
            dataset: { action: "forum-set-tag", tag: t },
            style: `
              border: 1px solid var(--border);
              background: ${active ? "color-mix(in srgb, var(--text) 8%, transparent)" : "var(--surfaceAlt)"};
              color: var(--text);
              padding: 7px 10px;
              border-radius: 999px;
              cursor: pointer;
              font-weight: 900;
              font-size: 12px;
            `,
          },
          [t]
        )
      );
    });
  }

  if (compose && draft) {
    draft.toggleAttribute("disabled", !isAuthed);
    draft.placeholder = isAuthed ? "What's on your mind?" : "Sign in to start posting…";
    compose.style.opacity = isAuthed ? "1" : "0.85";
  }

  if (postsSlot) {
    postsSlot.innerHTML = "";
    const list = STATE.posts.filter((p) => activeTag === "All" || p.tag === activeTag);
    const capped = isAuthed ? Math.min(list.length, Math.max(visibleCount, pageSize)) : 3;
    list.slice(0, capped).forEach((p) => postsSlot.append(renderPostCard(p, { readOnly: !isAuthed })));
    if (!isAuthed) {
      postsSlot.append(
        el("div", { class: "ccs-card", style: "padding: 16px; border-radius: 14px; border: 1px dashed var(--borderStrong); text-align:center;" }, [
          el("div", { style: "font-weight: 900; color: var(--textStrong);" }, ["Want to see the rest?"]),
          el("div", { style: "color: var(--textMuted); font-size: 13px; margin-top: 4px;" }, [
            `Sign in to view ${Math.max(0, list.length - 3)}+ more threads, comments, and join the conversation.`,
          ]),
          el("div", { style: "margin-top: 10px; display:inline-flex; gap: 8px;" }, [
            el("button", { type: "button", class: "ccs-btn ccs-btn-solid", dataset: { action: "go-login" } }, ["Sign in"]),
            el("button", { type: "button", class: "ccs-btn", dataset: { action: "go-register" } }, ["Create account"]),
          ]),
        ])
      );
    }
  }

  if (loadMoreSlot) {
    loadMoreSlot.innerHTML = "";
    if (!isAuthed) return; // guest stays as preview

    if (loadingMore) {
      loadMoreSlot.append(
        el("div", { style: "display:flex; flex-direction:column; gap: 1rem;" }, [0, 1, 2].map((i) =>
          el("div", { key: String(i), style: "height: 140px; border-radius: 18px; border: 1px solid var(--cardBorder); background: var(--surfaceAlt); backdrop-filter: blur(10px); overflow: hidden;" }, [
            el("div", { style: "height: 100%; background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.10), rgba(255,255,255,0.03)); background-size: 300% 100%; animation: ccsShimmer 1.2s ease-in-out infinite;" }),
          ])
        ))
      );
      return;
    }

    if (caughtUp) {
      loadMoreSlot.append(
        el("div", { class: "ccs-card", style: "padding: 14px 16px; border-radius: 14px; color: var(--textMuted); font-size: 13px; text-align:center;" }, ["You're all caught up."])
      );
      return;
    }

    loadMoreSlot.append(
      el("button", { type: "button", class: "ccs-btn", dataset: { action: "forum-load-more" }, style: "width: 100%;" }, ["Load more"])
    );
  }

  // Infinite scroll trigger (near-bottom). Install once per feed element.
  if (feed && !feed.dataset.boundScroll) {
    feed.dataset.boundScroll = "true";
    feed.addEventListener(
      "scroll",
      () => {
        if (!getAuthed()) return;
        if (window.sessionStorage.getItem("ccs.forum.loadingMore") === "true") return;
        if (window.sessionStorage.getItem(`ccs.forum.caughtUp.${activeTag}`) === "true") return;
        const nearBottom = feed.scrollTop + feed.clientHeight >= feed.scrollHeight - 40;
        if (!nearBottom) return;
        requestLoadMore(activeTag);
      },
      { passive: true }
    );
  }
}

function requestLoadMore(activeTag) {
  const visibleKey = `ccs.forum.visible.${activeTag}`;
  const current = Number(window.sessionStorage.getItem(visibleKey) || 8);
  window.sessionStorage.setItem("ccs.forum.loadingMore", "true");
  renderForumScreen();
  window.setTimeout(() => {
    // Simulate a “next page” by increasing visible count.
    const list = STATE.posts.filter((p) => activeTag === "All" || p.tag === activeTag);
    const next = Math.min(list.length, current + 8);
    window.sessionStorage.setItem(visibleKey, String(next));
    window.sessionStorage.setItem("ccs.forum.loadingMore", "false");
    if (next >= list.length) window.sessionStorage.setItem(`ccs.forum.caughtUp.${activeTag}`, "true");
    renderForumScreen();
  }, 850);
}

function renderPostCard(post, { readOnly }) {
  const canInteract = !readOnly && getAuthed();
  const wrapper = el("article", { class: "ccs-card", style: "padding: 12px 14px; border-radius: 18px;" });
  const user = MOCK_USERS[post.userId] || MOCK_USERS.u_you;
  wrapper.append(
    el("div", { style: "display:flex; align-items:center; gap: 8px; color: var(--textMuted); font-size: 12px;" }, [
      el("span", { class: "ccs-avatar-dot", "aria-hidden": "true" }),
      el(
        "span",
        {
          style: "color: var(--textStrong); font-weight: 800; cursor: pointer;",
          dataset: { action: "user-preview", userId: user.id },
        },
        [post.avatar]
      ),
      el("span", {}, [`· ${post.time}`]),
      el("span", { style: "margin-left:auto; font-weight: 800; color: var(--text);" }, [post.tag]),
    ])
  );
  wrapper.append(el("div", { style: "margin-top: 8px; color: var(--text); font-size: 14px; line-height: 1.5;" }, [post.content]));

  const actions = el("div", { style: "margin-top: 10px; display:flex; align-items:center; justify-content:space-between; gap: 10px;" });
  actions.append(el("div", { style: "color: var(--textMuted); font-size: 12px;" }, [`♥ ${post.likes} · 💬 ${post.comments}`]));
  actions.append(
    el("div", { style: "display:flex; gap: 8px;" }, [
      el("button", { type: "button", class: "ccs-btn", dataset: { action: canInteract ? "forum-like" : "go-login", postId: String(post.id) } }, ["Like"]),
      el(
        "button",
        { type: "button", class: "ccs-btn", dataset: { action: canInteract ? "forum-bookmark" : "go-login", postId: String(post.id) } },
        [post.bookmarked ? "Bookmarked" : "Bookmark"]
      ),
      el("button", { type: "button", class: "ccs-btn", dataset: { action: "forum-share", postId: String(post.id) } }, ["Share"]),
    ])
  );
  wrapper.append(actions);
  return wrapper;
}

function shellPageContainer(title, bodyNode) {
  return el("div", { style: "position: fixed; top: 0; left: var(--ccs-shell-left); right: 0; bottom: 0; overflow:auto; padding: 2rem var(--ccs-shell-pad-x); border-left: 1px solid var(--divider);" }, [
    el("div", { class: "ccs-card", style: "max-width: 860px; margin: 0 auto; padding: 18px;" }, [
      el("div", { style: "font-weight: 950; color: var(--textStrong); font-size: 20px; letter-spacing: -0.3px;" }, [title]),
      bodyNode,
    ]),
  ]);
}

function renderSearchScreen() {
  const root = $('[data-screen="search"]');
  if (!root) return;
  root.innerHTML = "";
  const q = window.sessionStorage.getItem("ccs.search.q") || "";

  const input = el("input", {
    value: q,
    placeholder: "Search posts…",
    style:
      "width:100%; box-sizing:border-box; background: var(--surfaceStrong); border: 1px solid var(--border); border-radius: 12px; padding: 11px 14px; color: var(--text); font-size: 14px; outline:none;",
  });
  input.addEventListener("input", () => {
    window.sessionStorage.setItem("ccs.search.q", input.value);
    renderSearchScreen();
  });

  const results = STATE.posts.filter((p) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return `${p.tag} ${p.content}`.toLowerCase().includes(needle);
  });

  const list = el("div", { style: "margin-top: 14px; display:flex; flex-direction:column; gap: 10px;" }, []);
  results.slice(0, 30).forEach((p) => list.append(renderPostCard(p, { readOnly: !getAuthed() })));

  root.append(
    shellPageContainer(
      "Search",
      el("div", {}, [
        el("div", { style: "margin-top: 10px;" }, [input]),
        el("div", { style: "margin-top: 10px; color: var(--textMuted); font-size: 13px;" }, [`Showing ${Math.min(results.length, 30)} of ${results.length} posts`]),
        list,
      ])
    )
  );
}

function renderProfileScreen() {
  const root = $('[data-screen="profile"]');
  if (!root) return;
  root.innerHTML = "";

  const name = el("input", {
    value: STATE.profile.name || "",
    style:
      "width:100%; box-sizing:border-box; background: var(--surfaceStrong); border: 1px solid var(--border); border-radius: 12px; padding: 11px 14px; color: var(--text); font-size: 14px; outline:none;",
  });
  const handle = el("input", {
    value: STATE.profile.handle || "",
    style:
      "width:100%; box-sizing:border-box; background: var(--surfaceStrong); border: 1px solid var(--border); border-radius: 12px; padding: 11px 14px; color: var(--text); font-size: 14px; outline:none;",
  });
  const bio = el("textarea", {
    style:
      "width:100%; box-sizing:border-box; min-height: 90px; background: var(--surfaceStrong); border: 1px solid var(--border); border-radius: 12px; padding: 11px 14px; color: var(--text); font-size: 14px; outline:none;",
  });
  bio.value = STATE.profile.bio || "";

  const role = el("select", { style: "width:100%; box-sizing:border-box; border-radius: 12px; padding: 11px 14px;" }, [
    el("option", { value: "" }, ["No override (Student)"]),
    el("option", { value: "Moderator" }, ["Moderator (override)"]),
    el("option", { value: "Admin" }, ["Admin (override)"]),
  ]);
  role.value = STATE.prefs.roleOverride || "";

  const save = el("button", { type: "button", class: "ccs-btn ccs-btn-solid", style: "margin-top: 10px;" }, ["Save profile"]);
  save.addEventListener("click", () => {
    STATE.profile.name = name.value.trim() || DEFAULT_PROFILE.name;
    STATE.profile.handle = handle.value.trim() || DEFAULT_PROFILE.handle;
    STATE.profile.bio = bio.value.trim();
    STATE.prefs.roleOverride = role.value;
    persistState();
    addActivity("profile_update");
    renderSidebar(routeToPage(window.location.hash));
    window.alert("Saved (static demo).");
  });

  const effectiveRole = STATE.prefs.roleOverride || STATE.profile.status || "Student";
  root.append(
    shellPageContainer(
      "Profile",
      el("div", { style: "margin-top: 12px; display:flex; flex-direction:column; gap: 10px;" }, [
        el("div", { style: "color: var(--textMuted); font-size: 13px;" }, [`Role: ${effectiveRole}`]),
        el("div", { style: "display:grid; grid-template-columns: 1fr 1fr; gap: 10px;" }, [
          el("div", {}, [el("div", { style: "color: var(--textMuted); font-size:12px; font-weight:800; margin-bottom:6px;" }, ["Name"]), name]),
          el("div", {}, [el("div", { style: "color: var(--textMuted); font-size:12px; font-weight:800; margin-bottom:6px;" }, ["Handle"]), handle]),
        ]),
        el("div", {}, [el("div", { style: "color: var(--textMuted); font-size:12px; font-weight:800; margin-bottom:6px;" }, ["Bio"]), bio]),
        el("div", {}, [el("div", { style: "color: var(--textMuted); font-size:12px; font-weight:800; margin-bottom:6px;" }, ["Role override (gutted admin)"]), role]),
        save,
      ])
    )
  );
}

function renderBookmarksScreen() {
  const root = $('[data-screen="bookmarks"]');
  if (!root) return;
  root.innerHTML = "";
  const list = STATE.posts.filter((p) => p.bookmarked);
  const body = el("div", { style: "margin-top: 12px;" }, []);
  body.append(el("div", { style: "color: var(--textMuted); font-size: 13px;" }, [`${list.length} bookmarked posts`]));
  body.append(el("div", { style: "margin-top: 12px; display:flex; flex-direction:column; gap: 10px;" }, list.map((p) => renderPostCard(p, { readOnly: false }))));
  root.append(shellPageContainer("Bookmarks", body));
}

function renderActivitiesScreen() {
  const root = $('[data-screen="activities"]');
  if (!root) return;
  root.innerHTML = "";
  const items = STATE.activities.slice(0, 40);
  const ul = el("div", { style: "margin-top: 12px; display:flex; flex-direction:column; gap: 8px;" }, []);
  items.forEach((a) => {
    const when = new Date(a.ts).toLocaleString();
    ul.append(
      el("div", { class: "ccs-card", style: "padding: 10px 12px; border-radius: 14px;" }, [
        el("div", { style: "font-weight: 800; color: var(--textStrong); font-size: 13px;" }, [a.type]),
        el("div", { style: "color: var(--textMuted); font-size: 12px; margin-top: 2px;" }, [when]),
      ])
    );
  });
  root.append(shellPageContainer("Activities", el("div", {}, [el("div", { style: "color: var(--textMuted); font-size: 13px; margin-top: 6px;" }, ["Recent actions in this static demo."]), ul])));
}

function renderFriendsScreen() {
  const root = $('[data-screen="friends"]');
  if (!root) return;
  root.innerHTML = "";
  const { friends, pending, outgoing } = STATE.friends || DEFAULT_STATE.friends;

  const mkPill = (label) => el("span", { class: "ccs-tag" }, [label]);
  const body = el("div", { style: "margin-top: 12px; display:flex; flex-direction:column; gap: 12px;" }, [
    el("div", {}, [el("div", { style: "color: var(--textMuted); font-size: 12px; font-weight: 900; letter-spacing: 0.12em;" }, ["FRIENDS"]), el("div", { style: "margin-top: 6px; display:flex; gap: 6px; flex-wrap:wrap;" }, friends.map(mkPill))]),
    el("div", {}, [el("div", { style: "color: var(--textMuted); font-size: 12px; font-weight: 900; letter-spacing: 0.12em;" }, ["PENDING"]), el("div", { style: "margin-top: 6px; display:flex; gap: 6px; flex-wrap:wrap;" }, pending.map(mkPill))]),
    el("div", {}, [el("div", { style: "color: var(--textMuted); font-size: 12px; font-weight: 900; letter-spacing: 0.12em;" }, ["OUTGOING"]), el("div", { style: "margin-top: 6px; display:flex; gap: 6px; flex-wrap:wrap;" }, outgoing.map(mkPill))]),
  ]);
  root.append(shellPageContainer("Friends", body));
}

function renderSubscriptionsScreen() {
  const root = $('[data-screen="subs"]');
  if (!root) return;
  root.innerHTML = "";
  const tags = (STATE.subs?.tags || []).map((t) => t.tag);
  const follows = STATE.subs?.follows || [];
  const body = el("div", { style: "margin-top: 12px; display:flex; flex-direction:column; gap: 12px;" }, [
    el("div", {}, [el("div", { style: "color: var(--textMuted); font-size: 12px; font-weight: 900; letter-spacing: 0.12em;" }, ["TAGS"]), el("div", { style: "margin-top: 6px; display:flex; gap: 6px; flex-wrap:wrap;" }, tags.map((t) => el("span", { class: "ccs-tag" }, [`#${t}`])))]),
    el("div", {}, [el("div", { style: "color: var(--textMuted); font-size: 12px; font-weight: 900; letter-spacing: 0.12em;" }, ["PEOPLE"]), el("div", { style: "margin-top: 6px; display:flex; gap: 6px; flex-wrap:wrap;" }, follows.map((t) => el("span", { class: "ccs-tag" }, [t])))]),
  ]);
  root.append(shellPageContainer("Subscriptions", body));
}

function renderSettingsScreen() {
  const root = $('[data-screen="settings"]');
  if (!root) return;
  root.innerHTML = "";
  const larger = el("input", { type: "checkbox" });
  larger.checked = !!STATE.prefs.largerText;
  const reduce = el("input", { type: "checkbox" });
  reduce.checked = !!STATE.prefs.reduceMotion;

  const save = el("button", { type: "button", class: "ccs-btn ccs-btn-solid", style: "margin-top: 10px;" }, ["Save settings"]);
  save.addEventListener("click", () => {
    STATE.prefs.largerText = larger.checked;
    STATE.prefs.reduceMotion = reduce.checked;
    persistState();
    addActivity("prefs_update");
    renderRoute(routeToPage(window.location.hash));
    window.alert("Saved (static demo).");
  });

  const body = el("div", { style: "margin-top: 12px; display:flex; flex-direction:column; gap: 10px;" }, [
    el("label", { style: "display:flex; align-items:center; gap: 10px; color: var(--text);" }, [larger, el("span", {}, ["Larger text"])]),
    el("label", { style: "display:flex; align-items:center; gap: 10px; color: var(--text);" }, [reduce, el("span", {}, ["Reduce motion (no fancy animations)"])]),
    el("div", { style: "color: var(--textMuted); font-size: 13px; margin-top: 4px;" }, ["Theme is controlled by the 🌙/☀ button in the navbar/sidebar."]),
    save,
  ]);
  root.append(shellPageContainer("Settings", body));
}

function renderAdminScreen() {
  const root = $('[data-screen="admin"]');
  if (!root) return;
  root.innerHTML = "";
  const effectiveRole = STATE.prefs.roleOverride || STATE.profile.status || "Student";
  if (effectiveRole !== "Moderator" && effectiveRole !== "Admin") {
    root.append(shellPageContainer("Moderator / Admin", el("div", { style: "margin-top: 10px; color: var(--textMuted); font-size: 13px; line-height:1.6;" }, ["This panel is available only to Moderator/Admin roles. Set it in Profile → Role override (static demo)."])));
    return;
  }
  const body = el("div", { style: "margin-top: 12px; display:flex; flex-direction:column; gap: 10px;" }, [
    el("div", { style: "color: var(--textMuted); font-size: 13px; line-height: 1.6;" }, ["Gutted moderation: you can only see basic counts."]),
    el("div", { class: "ccs-card", style: "padding: 12px 14px; border-radius: 14px;" }, [
      el("div", { style: "font-weight: 900; color: var(--textStrong);" }, ["Posts"]),
      el("div", { style: "color: var(--textMuted); font-size: 13px; margin-top: 2px;" }, [`${STATE.posts.length} total`]),
    ]),
    el("div", { class: "ccs-card", style: "padding: 12px 14px; border-radius: 14px;" }, [
      el("div", { style: "font-weight: 900; color: var(--textStrong);" }, ["Activities"]),
      el("div", { style: "color: var(--textMuted); font-size: 13px; margin-top: 2px;" }, [`${STATE.activities.length} logged`]),
    ]),
  ]);
  root.append(shellPageContainer("Moderator / Admin", body));
}

function setShellVisibility({ sidebarShell }) {
  const showSidebar = !!sidebarShell;
  $(".ccs-hamburger")?.toggleAttribute("hidden", !showSidebar);
  $('[data-slot="sidebar"]')?.toggleAttribute("hidden", !showSidebar);
  $('[data-slot="sidebar-backdrop"]')?.classList.toggle("is-open", false);
  $('[data-slot="sidebar"]')?.classList.toggle("is-open", false);
}

function renderRoute(page) {
  mountScreensOnce();
  const isAuthed = getAuthed();
  const guestAllowed = ["landing", "about", "login", "register", "forum", "search"];
  const requiresAuth = !isAuthed && !guestAllowed.includes(page);
  const actualPage = requiresAuth ? "login" : page;
  // We only have one auth container: data-screen="auth"
  const screenKey = actualPage === "login" || actualPage === "register" ? "auth" : actualPage;
  const sidebarShellPages = ["forum", "profile", "search", "activities", "bookmarks", "friends", "subs", "settings", "admin"];
  const sidebarShell = sidebarShellPages.includes(actualPage);

  setShellVisibility({ sidebarShell });
  if (sidebarShell) renderSidebar(actualPage);

  const screens = Array.from(document.querySelectorAll("[data-screen]"));
  screens.forEach((n) => n.toggleAttribute("hidden", n.getAttribute("data-screen") !== screenKey));

  // Nav "full" links: show only on landing/about like the React app.
  const showFull = actualPage === "landing" || actualPage === "about";
  $(".ccs-nav-links")?.toggleAttribute("hidden", !showFull);

  if (actualPage === "landing") {
    renderStaticContent();
    renderAuthUI();
    animateIn();
  }
  if (actualPage === "about") {
    renderAuthUI();
  }
  if (actualPage === "login" || actualPage === "register") {
    renderAuthUI();
    renderAuthScreen(actualPage);
  }
  if (actualPage === "forum") {
    renderAuthUI();
    renderForumScreen();
  }
  if (actualPage === "search") renderSearchScreen();
  if (actualPage === "profile") renderProfileScreen();
  if (actualPage === "activities") renderActivitiesScreen();
  if (actualPage === "bookmarks") renderBookmarksScreen();
  if (actualPage === "friends") renderFriendsScreen();
  if (actualPage === "subs") renderSubscriptionsScreen();
  if (actualPage === "settings") renderSettingsScreen();
  if (actualPage === "admin") renderAdminScreen();
}

function main() {
  hydrateState();
  setMode(getMode());
  applyLowPowerClass();
  window.addEventListener("resize", applyLowPowerClass, { passive: true });

  installActions();
  window.addEventListener("hashchange", () => renderRoute(routeToPage(window.location.hash)));

  const initial = routeToPage(window.location.hash);
  if (!window.location.hash) window.location.hash = ROUTES.landing;
  renderRoute(initial);
}

main();
