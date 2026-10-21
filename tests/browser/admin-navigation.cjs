const { chromium } = require("@playwright/test");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const base = process.env.CCS_BROWSER_FIXTURE_DIR;
const reports = [
  {
    id: "r1",
    postId: "p1",
    reporterUserId: "member-a",
    reason: "Repeated promotional links",
    createdAt: Date.now() - 720000,
  },
  {
    id: "r2",
    postId: "p2",
    reporterUserId: "member-b",
    reason: "Personal information shared",
    createdAt: Date.now() - 1800000,
  },
];
const members = [
  {
    id: "member-a",
    email: "member@example.com",
    role: "student",
    banned: false,
    profile: {
      name: "Community member",
      handle: "member",
      status: "Student",
      badges: [],
    },
  },
];
const server = http.createServer((req, res) => {
  const names = {
    "/": "inspector-check.html",
    "/inspector-check.js": "inspector-check.js",
    "/inspector-check.css": "inspector-check.css",
  };
  const requested = req.url.split("?")[0];
  const name =
    names[requested] ||
    (/^\/[A-Za-z0-9_-]+\.(js|css)$/.test(requested)
      ? requested.slice(1)
      : null);
  if (!name) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader(
    "Content-Type",
    name.endsWith(".js")
      ? "text/javascript"
      : name.endsWith(".css")
        ? "text/css"
        : "text/html",
  );
  res.end(fs.readFileSync(path.join(base, name)));
});
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    headless: true,
    channel:
      process.env.CCS_BROWSER_CHANNEL ||
      (process.platform === "win32" ? "msedge" : undefined),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    const apiCounts = {};
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.log(error.stack);
    });
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      apiCounts[url.pathname] = (apiCounts[url.pathname] || 0) + 1;
      let body = {};
      if (url.pathname === "/api/admin/overview")
        body = {
          totals: {
            users: 120,
            admins: 1,
            moderators: 3,
            banned: 2,
            posts: 480,
            comments: 950,
          },
          recentAudit: [],
          ops: {
            server: {
              node: "v22",
              platform: "linux",
              pid: 42,
              uptimeSeconds: 1200,
              memory: {
                rss: 80000000,
                heapUsed: 40000000,
                heapTotal: 65000000,
                external: 1000000,
              },
              timeZone: "UTC",
            },
            storage: {
              databaseSizeBytes: 25000000,
              relationStorageBytes: 4000000,
              postsTextBytes: 123000,
              commentsTextBytes: 456000,
            },
            database: {
              hostMasked: "configured",
              activeSessions: 10,
              sessionsTotal: 15,
              announcements: 2,
              tickets: 3,
              ticketsOpen: 1,
              auditLogRows: 10,
            },
            integrations: {
              transactionalEmail: false,
              publicAppUrl: true,
              authPepperSet: true,
              adminSelfRegistration: false,
            },
            api: { note: "Synthetic test data" },
          },
        };
      else if (url.pathname === "/api/admin/reports") body = { reports };
      else if (
        url.pathname.startsWith("/api/admin/reports/") &&
        route.request().method() === "PATCH"
      ) {
        reports.splice(
          reports.findIndex((r) => url.pathname.endsWith(r.id)),
          1,
        );
        body = { ok: true };
      } else if (url.pathname.startsWith("/api/posts/"))
        body = {
          post: {
            id: "p1",
            userId: "member-a",
            tag: "General",
            content:
              "This post was flagged for repeated promotional links. Review its context before taking action.",
            imageUrl: "",
          },
          users: { "member-a": { name: "Community member" } },
        };
      else if (url.pathname === "/api/admin/users") body = { users: members };
      else if (url.pathname === "/api/admin/site")
        body = { settings: { badgeRegistry: [], badgeColors: {} } };
      else if (url.pathname === "/api/admin/auth/mfa")
        body = { configured: false, enabled: false };
      else if (url.pathname === "/api/admin/tickets")
        body = {
          tickets: [
            {
              id: "t1",
              subject: "Help updating a profile",
              userId: "member-a",
              body: "Can you help me correct my profile?",
              staffReply: "",
              status: "open",
              updatedAt: Date.now(),
            },
          ],
        };
      else if (url.pathname === "/api/admin/announcements")
        body = {
          announcements: [
            {
              id: "a1",
              title: "Welcome to the community",
              body: "A place for thoughtful conversation.",
              pinned: true,
              createdAt: Date.now(),
            },
          ],
        };
      else if (url.pathname === "/api/admin/posts")
        body = {
          posts: [
            {
              id: "p1",
              content: "Welcome to the community",
              userId: "member-a",
              tag: "General",
              likedBy: [],
              commentCount: 0,
              createdAt: Date.now(),
            },
          ],
        };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.clock.install();
    await page.goto(url);
    await page.getByText("Live snapshots", { exact: true }).waitFor();
    await page
      .getByLabel("Community totals")
      .getByText("120", { exact: true })
      .waitFor();
    await page.clock.fastForward(15000);
    await page.getByText("Realtime trends", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Roles", exact: true }).click();
    await page
      .locator(".overview-trend-label")
      .filter({ hasText: "Administrators" })
      .waitFor();
    await page.getByRole("button", { name: "Memory", exact: true }).click();
    await page.getByText("Resident memory", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Platform", exact: true }).click();
    await page.getByText("Database size", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Community", exact: true }).click();
    await page.locator(".overview-connections summary").click();
    await page.getByText("Transactional email", { exact: true }).waitFor();
    await page.locator(".overview-connections summary").click();
    await page.locator(".overview-data summary").click();
    assert.ok((await page.locator(".overview-data tbody tr").count()) >= 2);
    await page.locator(".overview-data summary").click();

    for (const width of [1440, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        `Overview overflow ${width}`,
      );
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(base, "inspector-overview-mobile-redesign.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByRole("combobox", { name: "Appearance" })
      .selectOption("dark");
    await page.screenshot({
      path: path.join(base, "inspector-overview-dark-redesign.png"),
      fullPage: true,
    });
    await page
      .getByRole("combobox", { name: "Appearance" })
      .selectOption("light");
    await page.screenshot({
      path: path.join(base, "inspector-analytics-restored.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Reports", exact: true }).click();
    await page
      .getByRole("heading", { name: "Repeated promotional links", exact: true })
      .waitFor();
    await page.screenshot({
      path: path.join(base, "inspector-implemented-desktop.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: /Community.*Personal information shared/ })
      .click();
    await page
      .getByRole("heading", {
        name: "Personal information shared",
        exact: true,
      })
      .waitFor();
    assert.ok(page.url().includes("record=r2"));
    await page.getByRole("button", { name: "Dismiss", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Report dismissed" })
      .waitFor();
    await page.getByRole("button", { name: "People", exact: true }).click();
    await page
      .getByRole("heading", { name: "Community member", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Tickets", exact: true }).click();
    await page
      .getByRole("heading", { name: "Help updating a profile", exact: true })
      .waitFor();
    const peopleCalls = apiCounts["/api/admin/users"];
    await page.getByRole("button", { name: "People", exact: true }).click();
    await page
      .getByRole("heading", { name: "Community member", exact: true })
      .waitFor();
    assert.equal(
      apiCounts["/api/admin/users"],
      peopleCalls,
      "quick return to people reuses queue",
    );
    await page.getByRole("button", { name: "Posts", exact: true }).click();
    await page
      .getByRole("heading", {
        name: "A conversation, in context.",
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Announcements", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: "Welcome to the community",
        exact: true,
        level: 1,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Account security", exact: true })
      .click();
    await page
      .locator(".inspector-heading")
      .filter({ hasText: "Account security" })
      .waitFor();
    await page
      .getByRole("combobox", { name: "Appearance" })
      .selectOption("dark");
    await page.getByRole("button", { name: "Reports", exact: true }).click();
    assert.equal(
      await page.getByRole("combobox", { name: "Appearance" }).inputValue(),
      "dark",
    );
    for (const width of [1440, 1024, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      assert.equal(overflow, false, `overflow at ${width}px`);
    }
    await page
      .getByRole("button", { name: /Community.*Repeated promotional links/ })
      .click();
    await page
      .getByRole("button", { name: "Back to list", exact: true })
      .waitFor();
    await page.screenshot({
      path: path.join(base, "inspector-implemented-mobile.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Back to list", exact: true })
      .click();
    await page.getByRole("textbox", { name: "Search reports" }).waitFor();
    assert.equal(errors.length, 0, JSON.stringify(errors));
    console.log(
      "Browser checks passed: real Inspector UI, report selection/action, people/posts/tickets/announcements/security, theme persistence, URL state, responsive widths and mobile Back. Synthetic API fixtures only.",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
