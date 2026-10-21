"use client";

import Link from "next/link";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { canAccessSection } from "@/lib/ccs/staffPolicy.mjs";
import { CcsMarkdown } from "@/components/ccs-talks/components/CcsMarkdown";
const OverviewPane = lazy(() =>
  import("./AdminOverview").then((m) => ({ default: m.OverviewPane })),
);
const UsersPane = lazy(() =>
  import("./UserEditor").then((m) => ({ default: m.UserEditor })),
);
const PostsPane = lazy(() =>
  import("./WorkflowEditors").then((m) => ({ default: m.PostEditor })),
);
const AnnouncementsPane = lazy(() =>
  import("./WorkflowEditors").then((m) => ({ default: m.AnnouncementEditor })),
);
const SitePane = lazy(() =>
  import("./SettingsEditor").then((m) => ({ default: m.SettingsEditor })),
);
const TicketStaffRow = lazy(() =>
  import("./AdminPanes").then((m) => ({ default: m.TicketStaffRow })),
);
const AdminLandingPane = lazy(() =>
  import("./AdminLandingPane").then((m) => ({ default: m.AdminLandingPane })),
);
const AdminSecurityPane = lazy(() =>
  import("./AdminSecurityPane").then((m) => ({ default: m.AdminSecurityPane })),
);
import { ReauthDialog } from "./ReauthDialog";
import { AdminGlyph } from "./AdminGlyph";
import { adminTheme } from "./adminUi";
import { jsonFetch } from "./adminFetch";
import {
  INSPECTOR_SECTIONS,
  filterRecords,
  recordTitle,
  recordSubtitle,
} from "./inspectorModel.mjs";

const markdownTokens = {
  text: adminTheme.text,
  textStrong: adminTheme.textStrong,
  textMuted: adminTheme.muted,
  accent: adminTheme.accent,
  border: adminTheme.border,
  surfaceAlt: adminTheme.surfaceAlt,
};
const labels = {
  reports: "Report review",
  users: "Member details",
  posts: "Post details",
  tickets: "Ticket details",
  announcements: "Announcement",
  audit: "Event details",
};
function date(value) {
  return value ? new Date(Number(value)).toLocaleString() : "Date unavailable";
}

export function InspectorConsole({
  viewer,
  initialSection = "overview",
  initialRecordId = null,
  initialFilters = {},
}) {
  const [recordCache] = useState(() => new Map());
  const [location, setLocation] = useState({
    section: initialSection,
    record: initialRecordId,
    filters: initialFilters,
  });
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const allowed = INSPECTOR_SECTIONS.filter((item) =>
    canAccessSection(viewer.role, item.key),
  );
  const meta =
    allowed.find((item) => item.key === location.section) || allowed[0];

  const onError = useCallback((error) => {
    if (error?.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    setError(error?.message || "The request could not be completed.");
  }, []);

  function navigate(section, record = null, overrides = {}) {
    if (
      dirty &&
      !window.confirm("Discard unsaved changes and leave this record?")
    )
      return;
    const url = new URL(window.location.href);
    if (section !== location.section)
      for (const key of ["q", "status", "role", "banned", "from", "to"])
        url.searchParams.delete(key);
    for (const [key, value] of Object.entries(overrides))
      url.searchParams.set(key, value);
    url.searchParams.set("section", section);
    if (record) url.searchParams.set("record", record);
    else url.searchParams.delete("record");
    window.history.pushState(null, "", url);
    setLocation({
      section,
      record,
      filters: Object.fromEntries(
        ["q", "status", "role", "banned", "from", "to"].map((key) => [
          key,
          url.searchParams.get(key) || "",
        ]),
      ),
    });
    setDirty(false);
    setError("");
  }

  useEffect(() => {
    const onPop = () => {
      if (
        dirty &&
        !window.confirm("Discard unsaved changes and leave this record?")
      ) {
        const url = new URL(window.location.href);
        url.searchParams.set("section", location.section);
        if (location.record) url.searchParams.set("record", location.record);
        else url.searchParams.delete("record");
        window.history.pushState(null, "", url);
        return;
      }
      const params = new URL(window.location.href).searchParams;
      const section = params.get("section");
      setLocation({
        section: INSPECTOR_SECTIONS.some(
          (item) =>
            item.key === section && canAccessSection(viewer.role, section),
        )
          ? section
          : "overview",
        record: params.get("record"),
        filters: Object.fromEntries(
          ["q", "status", "role", "banned", "from", "to"].map((key) => [
            key,
            params.get(key) || "",
          ]),
        ),
      });
      setDirty(false);
      setError("");
    };
    const beforeUnload = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const onSaved = () => {
      recordCache.clear();
      setDirty(false);
    };
    const onDraft = (event) => setDirty(!!event.detail.dirty);
    window.addEventListener("ccs:admin-draft", onDraft);
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("ccs:admin-mutation", onSaved);
    return () => {
      window.removeEventListener("ccs:admin-draft", onDraft);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("ccs:admin-mutation", onSaved);
    };
  }, [dirty, location, viewer.role, recordCache]);

  function updateFilter(key, value) {
    if (
      dirty &&
      !window.confirm("Discard unsaved changes before changing this filter?")
    )
      return;
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    url.searchParams.delete("record");
    window.history.replaceState(null, "", url);
    setLocation((previous) => ({
      ...previous,
      record: null,
      filters: { ...previous.filters, [key]: value },
    }));
    setDirty(false);
  }

  async function signOut() {
    if (
      signingOut ||
      (dirty && !window.confirm("Discard unsaved changes and sign out?"))
    )
      return;
    setSigningOut(true);
    try {
      await jsonFetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } catch (error) {
      onError(error);
      setSigningOut(false);
    }
  }

  return (
    <div
      className="inspector-app"
      data-section={meta.key}
      data-detail={
        meta.endpoint ? !!location.record : location.record !== "__list"
      }
    >
      <ReauthDialog />
      <a className="inspector-skip" href="#inspector-detail">
        Skip to selected record
      </a>
      <aside className="inspector-rail" aria-label="Administration">
        <Link href="/" className="inspector-brand" aria-label="CCS Talks forum">
          C
        </Link>
        <nav aria-label="Admin sections">
          {allowed.map((item) => (
            <button
              key={item.key}
              type="button"
              className="inspector-rail-button"
              title={item.label}
              aria-label={item.label}
              aria-current={meta.key === item.key ? "page" : undefined}
              onClick={() => navigate(item.key)}
            >
              <AdminGlyph name={item.key} />
            </button>
          ))}
        </nav>
        <div className="inspector-rail-bottom">
          <Link
            href="/"
            className="inspector-rail-button"
            aria-label="Open forum"
            title="Open forum"
          >
            <AdminGlyph name="external" />
          </Link>
          <button
            className="inspector-rail-button"
            type="button"
            aria-label="Sign out"
            title="Sign out"
            disabled={signingOut}
            onClick={signOut}
          >
            <AdminGlyph name="exit" />
          </button>
        </div>
      </aside>
      <InspectorWorkspace
        filters={location.filters || {}}
        onFilter={updateFilter}
        cache={recordCache}
        key={meta.key}
        meta={meta}
        viewer={viewer}
        selectedId={location.record}
        onNavigate={navigate}
        onError={onError}
        error={error}
        dismissError={() => setError("")}
        onDirty={() => setDirty(true)}
      />
    </div>
  );
}

function InspectorWorkspace({
  filters,
  onFilter,
  cache,
  meta,
  viewer,
  selectedId,
  onNavigate,
  onError,
  error,
  dismissError,
  onDirty,
}) {
  const query = filters.q || "";
  const search = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value),
  );
  const cacheKey = meta.key + "?" + search.toString();
  const endpoint = meta.endpoint
    ? meta.endpoint + "?" + search.toString()
    : null;
  const [load, setLoad] = useState(
    () =>
      cache.get(cacheKey)?.load || {
        records: [],
        pending: !!endpoint,
        error: "",
        nextCursor: null,
      },
  );
  const [selectedExtra, setSelectedExtra] = useState(null);
  const [revision, setRevision] = useState(0);
  const [morePending, setMorePending] = useState(false);
  const moreController = useRef(null);
  const [status, setStatus] = useState("");
  const detailTitle = useRef(null);
  const appearance = useRef(null);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!endpoint) return;
    const cached = cache.get(cacheKey);
    if (
      revision === 0 &&
      cached &&
      Date.now() - cached.at < 15_000 &&
      (!selectedId ||
        cached.load.records.some((record) => record.id === selectedId))
    ) {
      const cachedTimer = window.setTimeout(() => setLoad(cached.load), 0);
      return () => window.clearTimeout(cachedTimer);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        setLoad((previous) => ({ ...previous, pending: true, error: "" }));
        jsonFetch(endpoint, { signal: controller.signal })
          .then(async (data) => {
            const records = Array.isArray(data[meta.dataKey])
              ? data[meta.dataKey]
              : [];
            let extra = null;
            if (
              selectedId &&
              selectedId !== "new" &&
              !records.some((record) => record.id === selectedId)
            ) {
              const selected = await jsonFetch(
                meta.endpoint + "?id=" + encodeURIComponent(selectedId),
                { signal: controller.signal },
              );
              extra =
                (selected[meta.dataKey] || []).find(
                  (record) => record.id === selectedId,
                ) || null;
            }
            if (controller.signal.aborted) return;
            setSelectedExtra(extra);
            const next = {
              records,
              pending: false,
              error: "",
              nextCursor: data.nextCursor || null,
            };
            cache.set(cacheKey, { load: next, at: Date.now() });
            setLoad(next);
          })
          .catch((error) => {
            if (!controller.signal.aborted) {
              setLoad((previous) => ({
                ...previous,
                pending: false,
                error: error.message,
              }));
              onError(error);
            }
          });
      },
      query ? 250 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      moreController.current?.abort();
    };
  }, [cache, cacheKey, endpoint, meta, query, revision, onError, selectedId]);

  async function loadMore() {
    if (morePending || !load.nextCursor) return;
    const controller = new AbortController();
    moreController.current = controller;
    setMorePending(true);
    try {
      const data = await jsonFetch(
        endpoint + "&cursor=" + encodeURIComponent(load.nextCursor),
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      const ids = new Set(load.records.map((record) => record.id));
      const next = {
        ...load,
        records: [
          ...load.records,
          ...(data[meta.dataKey] || []).filter((record) => !ids.has(record.id)),
        ],
        nextCursor: data.nextCursor || null,
      };
      cache.set(cacheKey, { load: next, at: Date.now() });
      setLoad(next);
    } catch (error) {
      if (!controller.signal.aborted) onError(error);
    } finally {
      if (!controller.signal.aborted) setMorePending(false);
    }
  }

  useEffect(() => {
    const onMutation = (event) => {
      if (
        meta.endpoint &&
        event.detail.url.startsWith(meta.endpoint.split("?")[0])
      )
        reload();
    };
    window.addEventListener("ccs:admin-mutation", onMutation);
    return () => window.removeEventListener("ccs:admin-mutation", onMutation);
  }, [meta, reload]);

  useEffect(() => {
    if (
      selectedId &&
      selectedId !== "__list" &&
      window.matchMedia("(max-width:760px)").matches
    )
      detailTitle.current?.focus();
  }, [selectedId]);

  useEffect(() => {
    let saved =
      document.querySelector(".ccs-admin-shell")?.dataset.appearance ||
      "system";
    try {
      saved = localStorage.getItem("ccs-admin-appearance") || saved;
    } catch {}
    if (["light", "dark", "system"].includes(saved)) {
      document.querySelector(".ccs-admin-shell").dataset.appearance = saved;
      appearance.current.value = saved;
    }
  }, []);

  const records = load.records;
  const selected =
    load.records.find((record) => record.id === selectedId) ||
    (selectedExtra?.id === selectedId ? selectedExtra : null) ||
    (!selectedId ? records[0] : null);
  const compose =
    meta.key === "announcements" &&
    selectedId === "new" &&
    viewer.role === "admin";
  const contexts = INSPECTOR_SECTIONS.filter(
    (item) =>
      item.group === meta.group && canAccessSection(viewer.role, item.key),
  );
  const initials = viewer.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <section className="inspector-list" aria-label={`${meta.label} queue`}>
        <div className="inspector-list-head">
          <div className="inspector-list-title">
            <h1>{meta.label}</h1>
            {meta.endpoint && !load.pending && (
              <span className="inspector-pill">{load.records.length}</span>
            )}
          </div>
          <p className="inspector-caption">{meta.description}</p>
          {meta.endpoint && (
            <input
              className="inspector-search"
              aria-label={`Search ${meta.label.toLowerCase()}`}
              placeholder={`Search ${meta.label.toLowerCase()}…`}
              value={query}
              onChange={(event) => onFilter("q", event.target.value)}
            />
          )}
          <div className="inspector-list-filters">
            {["reports", "tickets"].includes(meta.key) && (
              <select
                aria-label="Status filter"
                value={
                  filters.status || (meta.key === "reports" ? "open" : "all")
                }
                onChange={(event) => onFilter("status", event.target.value)}
              >
                {(meta.key === "reports"
                  ? ["open", "resolved", "dismissed", "all"]
                  : ["all", "open", "in_progress", "closed"]
                ).map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            )}
            {meta.key === "audit" && (
              <>
                <label className="inspector-caption">
                  From
                  <input
                    type="date"
                    aria-label="Audit from date"
                    value={filters.from || ""}
                    onChange={(event) => onFilter("from", event.target.value)}
                  />
                </label>
                <label className="inspector-caption">
                  To
                  <input
                    type="date"
                    aria-label="Audit to date"
                    value={filters.to || ""}
                    onChange={(event) => onFilter("to", event.target.value)}
                  />
                </label>
              </>
            )}
            {meta.key === "users" && (
              <>
                <select
                  aria-label="Role filter"
                  value={filters.role || ""}
                  onChange={(event) => onFilter("role", event.target.value)}
                >
                  <option value="">All roles</option>
                  {["student", "moderator", "admin"].map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
                <select
                  aria-label="Ban filter"
                  value={filters.banned || ""}
                  onChange={(event) => onFilter("banned", event.target.value)}
                >
                  <option value="">All accounts</option>
                  <option value="false">Active</option>
                  <option value="true">Banned</option>
                </select>
              </>
            )}
          </div>
          <div className="inspector-list-tools">
            {meta.endpoint && (
              <button
                type="button"
                className="inspector-button quiet inspector-icon-button"
                onClick={reload}
                aria-label="Refresh queue"
                title="Refresh queue"
              >
                <AdminGlyph name="refresh" size={15} />
              </button>
            )}
            {meta.key === "announcements" && viewer.role === "admin" && (
              <button
                type="button"
                className="inspector-button primary"
                onClick={() => onNavigate(meta.key, "new")}
              >
                New announcement
              </button>
            )}
          </div>
        </div>
        <div className="inspector-records">
          {meta.endpoint ? (
            <>
              {load.pending && (
                <div className="inspector-message" role="status">
                  Loading {meta.label.toLowerCase()}…
                </div>
              )}
              {!load.pending && load.error && (
                <div className="inspector-message" role="alert">
                  {load.error}
                  <br />
                  <button className="inspector-button" onClick={reload}>
                    Retry
                  </button>
                </div>
              )}
              {!load.pending && !load.error && !records.length && (
                <div className="inspector-message">
                  {query
                    ? "No records match your search."
                    : meta.key === "reports"
                      ? "You’re all caught up. There are no open reports."
                      : `No ${meta.label.toLowerCase()} to show.`}
                </div>
              )}
              {!load.error &&
                records.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    className="inspector-record"
                    aria-current={
                      selected?.id === record.id ? "true" : undefined
                    }
                    onClick={() => onNavigate(meta.key, record.id)}
                  >
                    <div className="inspector-record-top">
                      <span>
                        {meta.key === "users" ? record.role : meta.group}
                      </span>
                      <span>
                        {record.createdAt || record.updatedAt
                          ? new Date(
                              Number(record.createdAt || record.updatedAt),
                            ).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    <strong>{recordTitle(meta.key, record)}</strong>
                    <p>{recordSubtitle(meta.key, record)}</p>
                  </button>
                ))}
            </>
          ) : (
            <>
              <div className="inspector-context-heading">{meta.group}</div>
              {contexts.map((item) => (
                <button
                  className="inspector-record"
                  aria-current={item.key === meta.key ? "true" : undefined}
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                >
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </button>
              ))}
            </>
          )}
        </div>
        {load.nextCursor && (
          <button
            className="inspector-button inspector-load-more"
            disabled={morePending}
            onClick={loadMore}
          >
            {morePending ? "Loading…" : "Load more"}
          </button>
        )}
        <div className="inspector-list-footer">
          <span className="inspector-avatar">{initials}</span>
          <div>
            <strong>{viewer.name}</strong>
            <p className="inspector-caption">
              {viewer.role === "admin" ? "Administrator" : "Moderator"}
            </p>
          </div>
        </div>
      </section>
      <main
        className="inspector-detail"
        id="inspector-detail"
        aria-label="Selected record"
      >
        <header className="inspector-toolbar">
          <div className="inspector-toolbar-tools">
            <button
              type="button"
              className="inspector-button quiet inspector-icon-button inspector-back"
              onClick={() =>
                onNavigate(meta.key, meta.endpoint ? null : "__list")
              }
              aria-label="Back to list"
            >
              <AdminGlyph name="back" size={16} />
            </button>
            <h2 ref={detailTitle} tabIndex={-1}>
              {compose ? "New announcement" : labels[meta.key] || meta.label}
            </h2>
          </div>
          <div className="inspector-toolbar-tools">
            <span className="inspector-caption">
              {meta.group} / {meta.label}
            </span>
            <select
              ref={appearance}
              aria-label="Appearance"
              defaultValue="system"
              onChange={(event) => {
                document.querySelector(".ccs-admin-shell").dataset.appearance =
                  event.target.value;
                try {
                  localStorage.setItem(
                    "ccs-admin-appearance",
                    event.target.value,
                  );
                } catch {
                  /* Storage can be unavailable in private contexts. */
                }
              }}
            >
              <option value="system">System theme</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </header>
        {error && (
          <div className="inspector-alert" role="alert">
            <span>{error}</span>
            <button className="inspector-button quiet" onClick={dismissError}>
              Dismiss
            </button>
          </div>
        )}
        <div className="inspector-detail-content" onChangeCapture={onDirty}>
          {status && (
            <div role="status" className="inspector-status">
              {status}
            </div>
          )}
          {meta.endpoint && !selected && !compose ? (
            <div className="inspector-message">
              {load.pending
                ? "Loading your workspace…"
                : selectedId
                  ? "This record is no longer in the current queue. Select another record to continue."
                  : "Select a record when one is available."}
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="inspector-message" role="status">
                  Loading workspace…
                </div>
              }
            >
              <InspectorDetail
                onNavigate={onNavigate}
                meta={meta}
                record={selected}
                compose={compose}
                viewer={viewer}
                onError={onError}
                onSaved={reload}
                setStatus={setStatus}
              />
            </Suspense>
          )}
        </div>
      </main>
    </>
  );
}

function InspectorDetail({
  onNavigate,
  meta,
  record,
  compose,
  viewer,
  onError,
  onSaved,
  setStatus,
}) {
  const common = { onError, viewer };
  if (meta.key === "reports")
    return (
      <ReportInspector
        key={record.id}
        report={record}
        onError={onError}
        onSaved={onSaved}
        setStatus={setStatus}
      />
    );
  if (meta.key === "users")
    return (
      <>
        <DetailHeading
          eyebrow="Community member"
          title={recordTitle(meta.key, record)}
          subtitle={record.email}
        />
        <div className="inspector-legacy inspector-selected-record">
          <UsersPane key={record.id} {...common} selectedUser={record} />
        </div>
      </>
    );
  if (meta.key === "posts")
    return (
      <>
        <DetailHeading
          eyebrow={record.tag || "Post"}
          title="A conversation, in context."
          subtitle={`${record.authorName || "Former member"} · ${date(record.createdAt)}`}
        />
        <div className="inspector-preview">
          <CcsMarkdown
            source={record.content || ""}
            tokens={markdownTokens}
            accentColor={adminTheme.accent}
          />
          {record.imageUrl && (
            <img src={record.imageUrl} alt="Post attachment" />
          )}
        </div>
        <div className="inspector-legacy inspector-selected-record">
          <PostsPane key={record.id} {...common} selectedPost={record} />
        </div>
      </>
    );
  if (meta.key === "tickets")
    return (
      <>
        <DetailHeading
          eyebrow="Support request"
          title={record.subject}
          subtitle={`Updated ${date(record.updatedAt)}`}
        />
        <div className="inspector-legacy">
          <TicketStaffRow
            key={record.id}
            tk={record}
            onError={onError}
            onSaved={onSaved}
          />
        </div>
      </>
    );
  if (meta.key === "announcements")
    return (
      <>
        <DetailHeading
          eyebrow="Publishing"
          title={compose ? "Keep everyone in the loop." : record.title}
          subtitle={
            compose
              ? "Write an announcement for your community."
              : date(record.createdAt)
          }
        />
        <div className="inspector-legacy">
          <AnnouncementsPane
            key={compose ? "new" : record.id}
            {...common}
            selectedAnnouncement={compose ? undefined : record}
            composeOnly={compose}
          />
        </div>
      </>
    );
  if (meta.key === "audit")
    return (
      <>
        <DetailHeading
          eyebrow="Audit event"
          title={recordTitle(meta.key, record)}
          subtitle={date(record.createdAt)}
        />
        <dl className="inspector-metadata">
          <div>
            <dt>Actor</dt>
            <dd>{record.actorName || record.actorId}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{record.targetId || "No target"}</dd>
          </div>
        </dl>
        <div className="inspector-actions">
          <Link
            className="inspector-button"
            href={`/admin?section=users&record=${encodeURIComponent(record.actorId)}`}
          >
            View actor account
          </Link>
          {record.targetId && (
            <Link
              className="inspector-button"
              href={`/admin?section=${record.action.startsWith("user_") ? "users" : record.action.startsWith("post_") ? "posts" : record.action.startsWith("ticket_") ? "tickets" : record.action.startsWith("announcement_") ? "announcements" : record.action.startsWith("forum_report_") ? "reports" : "overview"}&record=${encodeURIComponent(record.targetId)}`}
            >
              View affected record
            </Link>
          )}
        </div>
        {record.meta && Object.keys(record.meta).length > 0 && (
          <dl className="inspector-metadata">
            {Object.entries(record.meta).map(([key, value]) => (
              <div key={key}>
                <dt>{key.replaceAll("_", " ")}</dt>
                <dd>
                  {typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </>
    );
  if (meta.key === "overview")
    return <OverviewPane onError={onError} onNavigate={onNavigate} />;
  return (
    <>
      <DetailHeading
        eyebrow={meta.group}
        title={meta.label}
        subtitle={meta.description}
      />
      <div className="inspector-legacy">
        {meta.key === "security" && <AdminSecurityPane onError={onError} />}
        {meta.key === "landing" && (
          <AdminLandingPane viewer={viewer} onError={onError} />
        )}
        {meta.key === "site" && <SitePane {...common} />}
      </div>
    </>
  );
}

function DetailHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      <p className="inspector-eyebrow">{eyebrow}</p>
      <h1 className="inspector-heading">{title}</h1>
      {subtitle && (
        <p className="inspector-caption" style={{ marginTop: 10 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ReportInspector({ report, onError, onSaved, setStatus }) {
  const [post, setPost] = useState({ loading: true, data: null, error: "" });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    jsonFetch(`/api/posts/${encodeURIComponent(report.postId)}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted)
          setPost({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setPost(
            report.snapshot?.post
              ? {
                  loading: false,
                  data: { post: report.snapshot.post, users: {} },
                  error: "",
                }
              : {
                  loading: false,
                  data: null,
                  error:
                    error.status === 404
                      ? "The original post has been removed."
                      : "The original post could not be loaded. Open the thread to verify context before resolving.",
                },
          );
          if (error.status === 401) onError(error);
        }
      });
    return () => controller.abort();
  }, [report.postId, report.snapshot, onError]);
  async function resolve(next, removePost = false) {
    if (
      busy ||
      (removePost &&
        !window.confirm(
          "Remove this post and close its report? The content snapshot and your resolution note will be retained.",
        ))
    )
      return;
    setBusy(true);
    try {
      await jsonFetch(`/api/admin/reports/${encodeURIComponent(report.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next, note, removePost }),
      });
      setStatus(
        removePost
          ? "Post removed and report resolved. Evidence retained."
          : `Report ${next}. ${next === "resolved" ? "The report was closed; its post was not changed." : "No action was taken on the post."}`,
      );
      onSaved();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  const author = post.data?.users?.[post.data?.post?.userId];
  return (
    <>
      <DetailHeading
        eyebrow="Post report"
        title={report.reason || "Review this conversation."}
      />
      <div>
        <span className="inspector-pill">{report.status || "open"}</span>
      </div>
      <div className="inspector-preview">
        {post.loading ? (
          <p className="inspector-caption" role="status">
            Loading original post…
          </p>
        ) : post.error ? (
          <p className="inspector-caption" role="status">
            {post.error}
          </p>
        ) : (
          <>
            <div className="inspector-byline">
              <span className="inspector-avatar">
                {(author?.name || "Member").slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{author?.name || "Community member"}</strong>
                <p className="inspector-caption">
                  {post.data.post.tag || "General"}
                </p>
              </div>
            </div>
            <CcsMarkdown
              source={post.data.post.content || ""}
              tokens={markdownTokens}
              accentColor={adminTheme.accent}
            />
            {post.data.post.imageUrl && (
              <img
                src={post.data.post.imageUrl}
                alt="Reported post attachment"
              />
            )}
          </>
        )}
      </div>
      <dl className="inspector-metadata">
        <div>
          <dt>Reported by</dt>
          <dd>{report.reporterUserId}</dd>
        </div>
        <div>
          <dt>Reported at</dt>
          <dd>{date(report.createdAt)}</dd>
        </div>
      </dl>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 550 }}>
          Context before action.
        </h2>
        <p className="inspector-caption">
          Review the conversation before closing this report. Resolving a report
          does not edit or remove its post.
        </p>
      </div>
      {report.resolutionNote && (
        <p className="inspector-caption">Resolution: {report.resolutionNote}</p>
      )}
      {(!report.status || report.status === "open") && (
        <label className="admin-field">
          Resolution note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            rows={3}
          />
        </label>
      )}
      <div className="inspector-actions">
        <button
          className="inspector-button primary"
          disabled={
            busy ||
            (report.status && report.status !== "open") ||
            post.loading ||
            !!post.error
          }
          onClick={() => resolve("resolved")}
        >
          {busy ? "Saving…" : "Resolve report"}
        </button>
        <button
          className="inspector-button"
          disabled={busy || (report.status && report.status !== "open")}
          onClick={() => resolve("dismissed")}
        >
          Dismiss
        </button>
        <button
          className="inspector-button"
          disabled={
            busy ||
            !note.trim() ||
            post.loading ||
            !!post.error ||
            (report.status && report.status !== "open")
          }
          onClick={() => resolve("resolved", true)}
        >
          Remove post and resolve
        </button>
        <Link
          className="inspector-button quiet"
          href={`/p/${encodeURIComponent(report.postId)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open conversation <AdminGlyph name="external" size={14} />
        </Link>
      </div>
    </>
  );
}
