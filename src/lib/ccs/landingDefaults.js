/**
 * Landing page CMS defaults (merged with Neon `ccs_site_settings.key = 'landing'`).
 * Stats (member/thread/active counts) are computed live — not part of CMS.
 */

import { APP_CONFIG, FORUM_RAIL } from "@/components/ccs-talks/config/appConfig";

export function defaultLandingCms() {
  return {
    brandName: APP_CONFIG.brand.name,
    creditBadge: APP_CONFIG.brand.org,
    heroEyebrow: "OLFU · COLLEGE OF COMPUTER STUDIES",
    heroSubtitle: APP_CONFIG.landing.heroSubtitle,
    statLabels: {
      members: "Members",
      threads: "Threads",
      activeToday: "Active today",
    },
    liveFeedLabel: "LIVE · SAMPLE FEED",
    featureCards: APP_CONFIG.landing.featureCards.map((c) => ({ ...c })),
    howItWorks: [
      {
        n: "01",
        t: "Sign in with your CCS email",
        b: "Use your @student.fatima.edu.ph or @fatima.edu.ph address. Mods keep things kind.",
      },
      {
        n: "02",
        t: "Subscribe to tags & people",
        b: "Follow #Academics or your favorite organizers — your feed stays focused.",
      },
      {
        n: "03",
        t: "Post, message, organize",
        b: "Threads, study circles, event sign-ups, and bookmarks live in one place.",
      },
    ],
    communitySectionLabel: "COMMUNITY",
    communityTitle: "The orgs, events, and circles that make CCS, CCS.",
    communityOrgs: APP_CONFIG.landing.community.orgs.map((o) => ({
      ...o,
      tags: [...o.tags],
    })),
    communityEvents: APP_CONFIG.landing.community.events.map((ev) => ({ ...ev })),
    upcomingLabel: "UPCOMING",
    organizerCta: {
      title: "Run an org or a circle?",
      body: "Apply for an Organizer badge — get pinning, scheduled posts, and event boosts.",
      buttonLabel: "Apply",
    },
    bottomCta: {
      title: "Ready to join the conversation?",
      subtitle: "Free for any verified OLFU CCS student.",
      signupLabel: "Sign up",
      browseGuestLabel: "Browse as guest",
      openForumLabel: "Open forum",
    },
    footerBrandLine: APP_CONFIG.brand.tagline,
    footerBlurb: "Built for CCS students — threads, resources, and campus life in one place.",
    footerColumns: APP_CONFIG.landing.footer.columns.map((c) => ({
      title: c.title,
      links: [...c.links],
    })),
    footerCopyright: APP_CONFIG.landing.footer.copyright,
    forumRail: {
      rising: [...FORUM_RAIL.rising],
      interests: [...FORUM_RAIL.interests],
      trending: [...FORUM_RAIL.trending],
    },
    /** Suggested badge labels for admin user editor (free text still allowed). */
    badgeCatalog: ["Dean’s Lister", "Org Member", "Moderator", "Hackathon", "Mentor", "CCS Night"],
    /** Tags shown in the forum composer (must match or extend feed filter chips). */
    postTagOptions: ["General", "Academics", "Tech", "Events"],
  };
}

export function mergeLandingCms(stored) {
  const d = defaultLandingCms();
  if (!stored || typeof stored !== "object") return d;

  const frIn = stored.forumRail && typeof stored.forumRail === "object" ? stored.forumRail : {};

  return {
    ...d,
    ...stored,
    statLabels: { ...d.statLabels, ...(stored.statLabels && typeof stored.statLabels === "object" ? stored.statLabels : {}) },
    featureCards:
      Array.isArray(stored.featureCards) && stored.featureCards.length > 0 ? stored.featureCards.map((c) => ({ ...c })) : d.featureCards,
    howItWorks:
      Array.isArray(stored.howItWorks) && stored.howItWorks.length > 0 ? stored.howItWorks.map((x) => ({ ...x })) : d.howItWorks,
    communityOrgs:
      Array.isArray(stored.communityOrgs) && stored.communityOrgs.length > 0
        ? stored.communityOrgs.map((o) => ({ ...o, tags: Array.isArray(o.tags) ? [...o.tags] : [] }))
        : d.communityOrgs,
    communityEvents:
      Array.isArray(stored.communityEvents) && stored.communityEvents.length > 0
        ? stored.communityEvents.map((ev) => ({ ...ev }))
        : d.communityEvents,
    organizerCta: { ...d.organizerCta, ...(stored.organizerCta && typeof stored.organizerCta === "object" ? stored.organizerCta : {}) },
    bottomCta: { ...d.bottomCta, ...(stored.bottomCta && typeof stored.bottomCta === "object" ? stored.bottomCta : {}) },
    footerColumns:
      Array.isArray(stored.footerColumns) && stored.footerColumns.length > 0
        ? stored.footerColumns.map((c) => ({ title: String(c.title || ""), links: Array.isArray(c.links) ? c.links.map(String) : [] }))
        : d.footerColumns,
    forumRail: {
      ...d.forumRail,
      rising: Array.isArray(frIn.rising) && frIn.rising.length ? frIn.rising.map(String) : d.forumRail.rising,
      interests: Array.isArray(frIn.interests) && frIn.interests.length ? frIn.interests.map(String) : d.forumRail.interests,
      trending: Array.isArray(frIn.trending) && frIn.trending.length ? frIn.trending.map(String) : d.forumRail.trending,
    },
    badgeCatalog:
      Array.isArray(stored.badgeCatalog) && stored.badgeCatalog.length > 0
        ? stored.badgeCatalog.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 40)
        : d.badgeCatalog,
    postTagOptions:
      Array.isArray(stored.postTagOptions) && stored.postTagOptions.length > 0
        ? stored.postTagOptions.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 24)
        : d.postTagOptions,
  };
}

export function formatStatNumber(n) {
  const x = Math.max(0, Number(n) || 0);
  if (x < 10_000) return String(x);
  if (x < 1_000_000) return `${Math.round(x / 1000)}k`;
  return `${(x / 1_000_000).toFixed(1)}M`.replace(/\.0M$/, "M");
}
