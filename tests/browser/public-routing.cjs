const { chromium, expect } = require('@playwright/test');
const { spawn } = require('node:child_process');
const { mkdtemp, mkdir } = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

// Run against the actual production Next router, not a component/router mock.
// Every API is intercepted before opening the app; no hosted data is touched.
const base = process.env.CCS_ROUTING_BASE_URL || 'http://127.0.0.1:3113';
const profile = { id: 'u_fixture', handle: 'fixture', name: 'Routing Fixture', bio: 'Synthetic profile', badges: [], avatarImage: '', bannerImage: '', publicRoleBadge: 'instructor' };
const author = { ...profile, id: 'u_author', handle: 'author', name: 'Fixture Author', publicRoleBadge: 'professor', forumRole: 'moderator' };
const post = { id: 'p_fixture', userId: author.id, content: 'Routing regression post', tag: 'General', ts: Date.now(), likes: 0, commentCount: 0 };
const me = { profile, role: 'student', prefs: { onboardingCompleted: true, reduceEffects: true, reduceMotion: true }, activities: [], friends: {}, subs: {} };

async function setup(browser, { signedIn = false, authDelay = 0, profileDelay = 0, postLoginDelay = 0, viewerRole = 'student' } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    localStorage.setItem('ccs.prefs.v1', JSON.stringify({ reduceEffects: true, reduceMotion: true, mode: 'dark' }));
    window.routeScreens = [];
    new MutationObserver(() => {
      const screen = document.querySelector('[data-ccs-page]')?.dataset.ccsPage;
      if (screen && window.routeScreens.at(-1) !== screen) window.routeScreens.push(screen);
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-ccs-page'] });
  });
  const calls = [];
  const errors = [];
  const documents = [];
  let session = signedIn;
  let authCalls = 0;
  await context.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    calls.push({ path: url.pathname, method: request.method(), body: request.postDataJSON() });
    let body = {}, status = 200;
    if (url.pathname === '/api/auth/me') {
      // Snapshot the response before delay, reproducing an old guest bootstrap
      // that completes after a successful login.
      const snapshot = session;
      const delay = ++authCalls === 1 ? authDelay : postLoginDelay;
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      body = snapshot ? { ...me, role: viewerRole } : { error: 'Unauthorized.' }; status = snapshot ? 200 : 401;
    } else if (url.pathname === '/api/auth/login') {
      session = true; body = { profile };
    } else if (url.pathname === '/api/auth/logout') {
      session = false; body = { ok: true };
    } else if (url.pathname === '/api/posts') body = { posts: [post], users: { [author.id]: author }, nextCursor: null };
    else if (url.pathname === '/api/posts/p_fixture') body = { post, users: { [author.id]: author } };
    else if (url.pathname.endsWith('/comments')) body = { comments: [], users: {} };
    else if (url.pathname === '/api/landing') body = { stats: [], badgeColors: {}, tagColors: {} };
    else if (url.pathname === '/api/presence') body = { online: {} };
    else if (url.pathname === '/api/announcements') body = { announcements: [] };
    else if (url.pathname === '/api/profile') {
      if (profileDelay) await new Promise(resolve => setTimeout(resolve, profileDelay));
      if (url.searchParams.get('visitHandle') === 'missing') { status = 404; body = { error: 'Not found.' }; }
      else if (request.method() === 'PATCH') body = { profile: { ...profile, ...request.postDataJSON() } };
      else body = { profile: author, friendIds: [] };
    } else if (url.pathname === '/api/profile-field-options') body = {};
    else if (url.pathname === '/api/tickets') body = { tickets: [] };
    else if (url.pathname === '/api/search') body = { posts: [], users: {} };
    else if (url.pathname === '/api/account') body = { ...me, ok: true };
    else throw new Error(`Unmocked API: ${request.method()} ${url.pathname}`);
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.resourceType() === 'document') documents.push(request.url()); });
  const screen = async (name) => expect(page.locator('[data-ccs-page]')).toHaveAttribute('data-ccs-page', name);
  return { context, page, screen, calls, errors, documents };
}

async function main() {
  let server, browser;
  try {
    if (!process.env.CCS_ROUTING_BASE_URL) {
      server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', '3113'], { stdio: 'pipe', windowsHide: true });
      let log = ''; server.stdout.on('data', chunk => { log += chunk; }); server.stderr.on('data', chunk => { log += chunk; });
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        try { if ((await fetch(`${base}/login`)).ok) { ready = true; break; } } catch {}
        if (server.exitCode !== null) throw new Error(log);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      assert(ready, `Next server did not become ready: ${log}`);
    }
    await mkdir('.browser-artifacts', { recursive: true });
    const artifacts = await mkdtemp(path.resolve('.browser-artifacts/public-routing-'));
    browser = await chromium.launch({ channel: process.env.CCS_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined) });

    // Real navigation creates history entries and keeps the provider alive.
    const guest = await setup(browser);
    const { page, screen } = guest;
    await page.route('http://previous.test/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Previous site</title>Previous site' }));
    await page.goto('http://previous.test/');
    await page.goto(`${base}/login`);
    await screen('login');
    await page.getByRole('button', { name: 'Sign up', exact: true }).click();
    await expect(page).toHaveURL(`${base}/register`); await screen('register');
    await page.goBack(); await expect(page).toHaveURL(`${base}/login`); await screen('login');
    await page.goForward(); await expect(page).toHaveURL(`${base}/register`); await screen('register');
    await page.goBack(); await screen('login');
    assert.equal(guest.calls.filter(call => call.path === '/api/auth/me').length, 1, 'route changes must not restart session bootstrap');
    assert.equal(guest.calls.filter(call => call.path === '/api/posts').length, 0, 'auth screens must not load a forum feed');
    assert.deepEqual(await page.evaluate(() => window.routeScreens), ['login', 'register', 'login', 'register', 'login']);
    assert.equal(guest.documents.length, 2, 'in-app navigation must not fetch new documents');
    await page.goBack(); await expect(page).toHaveURL('http://previous.test/');
    assert.deepEqual(guest.errors, []);
    await guest.context.close();

    // Slow profile data must not redirect away from the page chosen with Back.
    const member = await setup(browser, { signedIn: true, authDelay: 600, profileDelay: 900 });
    await member.page.goto(`${base}/settings`);
    await member.screen('settings');
    await expect(member.page.getByText('Checking your session…')).toBeVisible();
    await expect(member.page.getByText('App-level preferences.', { exact: false })).toBeVisible();
    await member.page.locator('.ccs-sidebar').getByText(/Home$/).click();
    await member.screen('forum');
    await member.page.getByRole('button', { name: "View Fixture Author's profile" }).hover();
    const preview = member.page.getByRole('region', { name: 'Profile preview for Fixture Author' });
    await expect(preview.getByText('Professor', { exact: true })).toBeVisible();
    await expect(preview.getByText('Moderator', { exact: true })).toBeVisible();
    await member.page.screenshot({ path: path.join(artifacts, 'faculty-hover-preview.png') });
    await member.page.mouse.move(1400, 900);
    await member.page.getByText(post.content, { exact: true }).click();
    await expect(member.page).toHaveURL(`${base}/p/p_fixture`); await member.screen('post');
    await member.page.goBack(); await expect(member.page).toHaveURL(`${base}/forum`); await member.screen('forum');
    await member.page.getByRole('button', { name: "View Fixture Author's profile" }).click();
    await expect(member.page).toHaveURL(`${base}/profile/author`); await member.screen('profile');
    await expect(member.page.getByText('Loading profile…')).toBeVisible();
    await member.page.goBack(); await member.screen('forum');
    await member.page.waitForTimeout(1100);
    await expect(member.page).toHaveURL(`${base}/forum`); await member.screen('forum');
    await member.page.goForward(); await member.screen('profile');
    await expect(member.page.getByText('Loading profile…')).toHaveCount(0);
    await expect(member.page.getByText('Fixture Author', { exact: true }).first()).toBeVisible();
    await expect(member.page.getByText('Professor', { exact: true }).first()).toBeVisible();
    await expect(member.page.getByText('Moderator', { exact: true }).first()).toBeVisible();
    await member.page.screenshot({ path: path.join(artifacts, 'profile-after-forward.png') });
    await member.page.getByRole('button', { name: 'Back to my profile', exact: true }).click();
    await expect(member.page).toHaveURL(`${base}/profile`); await member.screen('profile');
    await expect(member.page.getByText('Routing Fixture', { exact: true }).first()).toBeVisible();
    await member.page.goBack(); await expect(member.page).toHaveURL(`${base}/profile/author`);
    await expect(member.page.getByText('Fixture Author', { exact: true }).first()).toBeVisible();
    assert(!((await member.page.evaluate(() => window.routeScreens)).includes('landing')), 'no landing screen during deep links or navigation');
    assert.equal(member.calls.filter(call => call.path === '/api/auth/me').length, 1);
    assert.equal(member.documents.length, 1, 'provider must stay mounted through forum/post/profile/history changes');
    assert.deepEqual(member.errors, []);
    await member.context.close();

    const self = await setup(browser, { signedIn: true, viewerRole: 'admin' });
    await self.context.route(`${base}/admin**`, route => route.fulfill({ status: 404, body: 'No admin prefetch in this synthetic test' }));
    await self.page.goto(`${base}/profile`); await self.screen('profile');
    await expect(self.page.getByText('Instructor', { exact: true }).first()).toBeVisible();
    await expect(self.page.getByText('Administrator', { exact: true }).first()).toBeVisible();
    assert.deepEqual(self.errors, []);
    await self.context.close();

    // Direct deep links render the requested screen before client effects run.
    for (const [url, name] of [['/p/p_fixture#c_fixture', 'post'], ['/profile/author', 'profile'], ['/profile/missing', 'profile'], ['/register', 'register']]) {
      const direct = await setup(browser);
      const response = await direct.page.goto(base + url);
      assert((await response.text()).includes(`data-ccs-page="${name}"`), `server HTML must select ${name} for ${url}`);
      await direct.screen(name);
      if (url.includes('missing')) await expect(direct.page.getByText('@missing', { exact: true })).toBeVisible();
      else if (name === 'profile') await expect(direct.page.getByText('Fixture Author', { exact: true }).first()).toBeVisible();
      assert(!((await direct.page.evaluate(() => window.routeScreens)).includes('landing')), `no landing flash at ${url}`);
      assert.deepEqual(direct.errors, []);
      await direct.context.close();
    }

    const guarded = await setup(browser, { authDelay: 400 });
    await guarded.page.goto(`${base}/forum`); await guarded.screen('forum');
    await guarded.page.locator('.ccs-sidebar').getByText(/Settings$/).click();
    await guarded.screen('login'); await expect(guarded.page).toHaveURL(`${base}/login`);
    await guarded.page.goBack(); await guarded.screen('forum');
    await expect(guarded.page).toHaveURL(`${base}/forum`);
    assert.deepEqual(guarded.errors, []);
    await guarded.context.close();

    // A pending unauthenticated bootstrap cannot undo a successful sign-in.
    const login = await setup(browser, { authDelay: 1800, postLoginDelay: 2200 });
    await login.page.goto(`${base}/login`); await login.screen('login');
    await login.page.locator('input[type=email]').fill('fixture@example.test');
    await login.page.locator('input[type=password]').fill('fixture-password');
    await login.page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
    await login.screen('forum');
    await login.page.waitForTimeout(1300);
    assert.equal(login.calls.filter(call => call.path === '/api/account' && call.method === 'PATCH').length, 0, 'cached preferences must not overwrite the account before its server snapshot arrives');
    await login.page.waitForTimeout(1200);
    await login.page.locator('.ccs-sidebar').getByText(/Settings$/).click();
    await login.screen('settings'); await expect(login.page).toHaveURL(`${base}/settings`);
    assert.deepEqual(login.errors, []);
    await login.context.close();
    console.log('Public routing passed: real Next Back/Forward, previous-site boundary, persistent shell, direct post/profile/auth links, no landing flash, deferred session guard, stale profile/login responses. Synthetic API responses only.');
    console.log(`Browser artifacts: ${artifacts}`);
  } finally {
    if (browser) await browser.close();
    if (server) { server.kill(); await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); }); }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
