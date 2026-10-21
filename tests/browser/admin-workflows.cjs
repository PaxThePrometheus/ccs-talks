const { chromium } = require("@playwright/test");
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const dir = process.env.CCS_BROWSER_FIXTURE_DIR;
const server = http.createServer((req, res) => {
  const name =
    req.url === "/" ? "inspector-check.html" : req.url.slice(1).split("?")[0];
  if (!/^[\w-]+\.(html|js|css)$/.test(name)) {
    res.writeHead(404).end();
    return;
  }
  try {
    res.setHeader(
      "Content-Type",
      name.endsWith(".js")
        ? "text/javascript"
        : name.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.end(fs.readFileSync(path.join(dir, name)));
  } catch {
    res.writeHead(404).end();
  }
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
      }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let rejectConflict = false,
      requireReauth = false,
      ticketWrites = 0,
      landingWrites = 0;
    const members = [1, 2, 3].map((i) => ({
      id: "u" + i,
      email: `member${i}@example.com`,
      role: "student",
      banned: false,
      createdAt: Date.now(),
      version: 0,
      profile: {
        name: ["Community member", "Second member", "Third member"][i - 1],
        handle: "member" + i,
        badges: [],
        status: "Student",
      },
    }));
    let announcement = {
      id: "a1",
      title: "Welcome to the community",
      body: "Original announcement.",
      pinned: false,
      version: 0,
      authorId: "admin-a",
      createdAt: Date.now(),
    };
    let ticket = {
      id: "t1",
      subject: "Support request",
      userId: "u1",
      body: "Please help.",
      staffReply: "",
      messages: [],
      status: "open",
      version: 0,
      updatedAt: Date.now(),
    };
    let cms = {
      brandName: "CCS Talks",
      heroEyebrow: "CCS",
      heroSubtitle: "A community",
      featureCards: [],
      communityOrgs: [],
      communityEvents: [],
      bottomCta: { title: "Join us", subtitle: "Welcome" },
    };
    let cmsVersion = 0,
      revisions = [],
      settings = {
        registrationOpen: true,
        guestReadOnly: true,
        requireEmailVerification: false,
        autoModLinkPosts: false,
        bannedWords: [],
        badgeRegistry: [],
        badgeColors: {},
        profileFieldOptions: {
          programs: ["BS Computer Science"],
          campuses: ["Antipolo"],
          years: ["1st Year"],
          focuses: ["Web"],
          orgs: ["None"],
        },
        version: 0,
      };
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        method = req.method();
      let body = {},
        status = 200;
      const payload = method === "GET" ? {} : req.postDataJSON();
      if (url.pathname === "/api/admin/overview")
        body = {
          totals: {
            users: 3,
            admins: 1,
            moderators: 0,
            banned: 0,
            posts: 1,
            comments: 0,
          },
          recentAudit: [],
          ops: null,
        };
      else if (url.pathname === "/api/admin/users") {
        let filtered = members.filter(
          (row) =>
            !url.searchParams.get("id") ||
            row.id === url.searchParams.get("id"),
        );
        if (url.searchParams.get("q"))
          filtered = filtered.filter((row) =>
            row.profile.name
              .toLowerCase()
              .includes(url.searchParams.get("q").toLowerCase()),
          );
        body = {
          users: url.searchParams.get("cursor")
            ? filtered.slice(2)
            : filtered.slice(0, 2),
          nextCursor:
            !url.searchParams.get("cursor") && filtered.length > 2
              ? "page2"
              : null,
        };
      } else if (url.pathname.startsWith("/api/admin/users/")) {
        const member = members.find((row) => url.pathname.endsWith(row.id));
        if (method === "GET") body = { user: member };
        else if (rejectConflict) {
          rejectConflict = false;
          member.version++;
          status = 409;
          body = { error: "This account changed. Reload before saving." };
        } else if (requireReauth) {
          requireReauth = false;
          status = 428;
          body = { error: "reauth_required" };
        } else if (payload.expectedVersion !== member.version) {
          status = 409;
          body = { error: "Stale account." };
        } else {
          member.profile = { ...member.profile, ...payload.profile };
          member.version++;
          body = { user: member };
        }
      } else if (url.pathname === "/api/admin/announcements")
        body = { announcements: [announcement], nextCursor: null };
      else if (url.pathname.startsWith("/api/admin/announcements/")) {
        announcement = {
          ...announcement,
          ...payload,
          version: announcement.version + 1,
        };
        body = { announcement };
      } else if (url.pathname === "/api/admin/tickets")
        body = { tickets: [ticket], nextCursor: null };
      else if (url.pathname.startsWith("/api/admin/tickets/")) {
        ticketWrites++;
        await new Promise((resolve) => setTimeout(resolve, 120));
        ticket = {
          ...ticket,
          status: payload.status,
          version: ticket.version + 1,
          messages: [
            ...ticket.messages,
            {
              id: "m" + ticketWrites,
              body: payload.message,
              authorId: "admin-a",
              createdAt: Date.now(),
            },
          ],
        };
        body = { ticket };
      } else if (url.pathname === "/api/admin/landing") {
        if (method === "PATCH") {
          landingWrites++;
          revisions.unshift({
            id: "rev" + landingWrites,
            created_at: Date.now(),
            actor_id: "admin-a",
            value: cms,
          });
          cms = payload.restoreRevisionId
            ? revisions.find((row) => row.id === payload.restoreRevisionId)
                .value
            : payload.cms;
          cmsVersion++;
        }
        body = { cms, version: cmsVersion, revisions };
      } else if (url.pathname === "/api/admin/site") {
        if (method === "PATCH") {
          settings = { ...settings, ...payload, version: settings.version + 1 };
          delete settings.expectedVersion;
        }
        body = { settings };
      } else if (url.pathname === "/api/admin/auth/mfa")
        body = { configured: false, enabled: false };
      else if (url.pathname === "/api/admin/auth/reauth") body = { ok: true };
      else if (url.pathname === "/api/admin/reports")
        body = { reports: [], nextCursor: null };
      else if (url.pathname === "/api/admin/posts")
        body = { posts: [], nextCursor: null };
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    const choose = async (name) => {
      await page.getByRole("button", { name, exact: true }).click();
    };
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await choose("People");
    await page
      .getByRole("heading", { name: "Community member", exact: true })
      .waitFor();
    await choose("Load more");
    await page.getByRole("button", { name: /Third member/ }).waitFor();
    await page.getByLabel("Search people").fill("Second");
    await page
      .getByRole("heading", { name: "Second member", exact: true })
      .waitFor();
    assert.ok(page.url().includes("q=Second"));
    await page.getByLabel("Search people").fill("");
    await page
      .getByRole("heading", { name: "Community member", exact: true })
      .waitFor();
    await page.getByLabel("Name", { exact: true }).fill("Draft member");
    page.once("dialog", (dialog) => dialog.dismiss());
    await choose("Posts");
    assert.ok(
      !page.url().includes("section=posts"),
      "dirty navigation declined",
    );
    rejectConflict = true;
    await choose("Save profile");
    await page
      .getByRole("alert")
      .filter({ hasText: "account changed" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Name", { exact: true }).inputValue(),
      "Draft member",
    );
    page.once("dialog", (dialog) => dialog.accept());
    await choose("Reload account");
    await page
      .getByRole("status")
      .filter({ hasText: "Loaded the latest" })
      .waitFor();
    await page.getByLabel("Name", { exact: true }).fill("Saved member");
    await choose("Save profile");
    await page
      .getByRole("status")
      .filter({ hasText: "Account saved" })
      .waitFor();
    assert.equal(members[0].profile.name, "Saved member");
    await page.getByLabel("Name", { exact: true }).fill("Reauth draft");
    requireReauth = true;
    await choose("Save profile");
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(
      await page.getByLabel("Name", { exact: true }).inputValue(),
      "Reauth draft",
    );
    page.once("dialog", (dialog) => dialog.accept());
    await choose("Discard changes");
    await choose("Announcements");
    await page
      .getByLabel("Title", { exact: true })
      .fill("Corrected announcement");
    await choose("Save announcement");
    await page
      .getByRole("status")
      .filter({ hasText: "Announcement updated" })
      .waitFor();
    assert.equal(announcement.title, "Corrected announcement");
    await choose("Tickets");
    await page.getByLabel("New reply").fill("A retained reply");
    await page
      .getByRole("button", { name: "Send reply and save" })
      .evaluate((button) => {
        button.click();
        button.click();
      });
    await page
      .getByRole("status")
      .filter({ hasText: "Ticket saved" })
      .waitFor();
    assert.equal(ticketWrites, 1, "double click sends one reply");
    assert.equal(ticket.messages.length, 1);
    await choose("Landing page");
    await page
      .locator(".admin-cms-section > summary")
      .filter({ hasText: /^Brand Name$/ })
      .click();
    await page
      .getByLabel("Brand Name", { exact: true })
      .fill("New community brand");
    await choose("Preview draft");
    assert.equal(landingWrites, 0);
    await page
      .getByRole("heading", { name: "New community brand", exact: true })
      .waitFor();
    await choose("Publish changes");
    await page
      .getByRole("status")
      .filter({ hasText: "Landing page published" })
      .waitFor();
    assert.equal(landingWrites, 1);
    page.once("dialog", (dialog) => dialog.accept());
    await choose("Restore this revision");
    await page
      .getByRole("status")
      .filter({ hasText: "Revision restored" })
      .waitFor();
    assert.equal(cms.brandName, "CCS Talks");
    await choose("Settings");
    await page.getByRole("switch", { name: /Allow guest browsing/ }).uncheck();
    await choose("Save settings");
    await page
      .getByRole("status")
      .filter({ hasText: "Settings saved" })
      .waitFor();
    assert.equal(settings.guestReadOnly, false);
    assert.equal(
      await page
        .getByRole("switch", { name: /Require email verification/ })
        .isDisabled(),
      true,
    );
    for (const width of [1440, 1024, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        `settings overflow ${width}`,
      );
    }
    await page.screenshot({
      path: path.join(dir, "phase-settings-mobile.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Workflow checks passed: pagination, URL search, discard protection, conflict recovery, reauth cancellation, announcement edit, ticket duplicate prevention/history, typed CMS preview/publish/rollback, settings and mobile widths. Synthetic API fixtures only.",
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
