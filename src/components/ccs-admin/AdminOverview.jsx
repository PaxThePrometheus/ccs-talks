"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminGlyph } from "./AdminGlyph";
import { jsonFetch } from "./adminFetch";
import "./overview.css";

const OVERVIEW_POLL_MS = 14_000;
const OVERVIEW_HISTORY = 72;
const number = (value) =>
  Number.isFinite(Number(value)) && value != null
    ? Number(value).toLocaleString()
    : "—";
function bytes(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  let size = Number(value),
    unit = 0;
  const units = ["B", "KB", "MB", "GB", "TB"];
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size < 10 && unit ? size.toFixed(1) : Math.round(size)} ${units[unit]}`;
}
function duration(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  if (seconds >= 86400)
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  if (seconds >= 3600)
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
const series = (history, pick) =>
  history
    .map(pick)
    .filter((value) => typeof value === "number" && Number.isFinite(value));

function Sparkline({ values, label, large = false, format = number }) {
  if (values.length < 2)
    return (
      <div className={`overview-chart-empty${large ? " large" : ""}`}>
        <span>Collecting samples</span>
      </div>
    );
  const min = Math.min(...values),
    max = Math.max(...values);
  const span = max - min;
  const points = values
    .map(
      (value, index) =>
        `${8 + (index / (values.length - 1)) * 304},${span ? 64 - ((value - min) / span) * 48 : 40}`,
    )
    .join(" ");
  return (
    <div className={`overview-spark${large ? " large" : ""}`}>
      <svg
        viewBox="0 0 320 80"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label}: ${format(values[0])} to ${format(values.at(-1))}; sample range ${format(min)} to ${format(max)}`}
      >
        <path className="overview-chart-grid" d="M8 16H312M8 40H312M8 64H312" />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx="312"
          cy={span ? 64 - ((values.at(-1) - min) / span) * 48 : 40}
          r="2.5"
          fill="currentColor"
        />
      </svg>
      {large && (
        <div className="overview-chart-range">
          <span>
            {format(min)} – {format(max)}
          </span>
          <span>Sample range</span>
        </div>
      )}
    </div>
  );
}
function Metric({ title, value, hint, history, metric, icon }) {
  return (
    <div className="overview-metric">
      <div className="overview-metric-label">
        <span>{title}</span>
        <AdminGlyph name={icon} size={17} />
      </div>
      <strong>{number(value)}</strong>
      <p>{hint}</p>
      <Sparkline
        values={series(history, (sample) => sample.totals?.[metric])}
        label={title}
      />
    </div>
  );
}
function Reading({ label, value, note }) {
  return (
    <div className="overview-reading">
      <dt>{label}</dt>
      <dd>
        {value}
        {note && <small>{note}</small>}
      </dd>
    </div>
  );
}
function Diagnostic({ title, caption, children, chart }) {
  return (
    <section className="overview-diagnostic">
      <h3>{title}</h3>
      <p className="overview-caption">{caption}</p>
      <dl>{children}</dl>
      {chart}
    </section>
  );
}
function Trend({ label, values, format = number }) {
  return (
    <div className="overview-trend">
      <div className="overview-trend-label">
        <span>{label}</span>
        <strong>{values.length ? format(values.at(-1)) : "—"}</strong>
      </div>
      <Sparkline values={values} label={label} format={format} large />
    </div>
  );
}
function Configuration({ label, enabled, off = "Not configured", children }) {
  return (
    <div className="overview-config-row">
      <span>{label}</span>
      <span className={`overview-config-state${enabled ? " ready" : ""}`}>
        {enabled ? "Configured" : off}
      </span>
      {children && <small>{children}</small>}
    </div>
  );
}

export function OverviewPane({ onError, onNavigate }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [pollError, setPollError] = useState(null);

  const activeRequest = useRef(null);
  const fetchOverview = useCallback(async () => {
    if (activeRequest.current || document.visibilityState === "hidden") return;
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const d = await jsonFetch("/api/admin/overview", {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setData(d);
      setLastRefresh(Date.now());
      setPollError(null);

      const snap = {
        ts: Date.now(),
        totals: d.totals,
        ops: d.ops && typeof d.ops === "object" && !d.ops.error ? d.ops : null,
      };

      setHistory((h) => {
        const next = [...h, snap];
        if (next.length > OVERVIEW_HISTORY)
          return next.slice(-OVERVIEW_HISTORY);
        return next;
      });
    } catch (e) {
      if (controller.signal.aborted) return;
      setPollError(e?.message || "Refresh failed.");
      if (e?.status === 401) onError(e);
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [onError]);

  useEffect(() => {
    const initial = window.setTimeout(() => void fetchOverview(), 0);
    const onVisible = () => {
      if (!document.hidden) void fetchOverview();
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(() => void fetchOverview(), OVERVIEW_POLL_MS);
    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
      window.clearInterval(id);
      window.clearTimeout(initial);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchOverview]);

  if (!data)
    return (
      <div className="overview-loading" role={pollError ? "alert" : "status"}>
        <AdminGlyph name="overview" size={26} />
        <h1>
          {pollError
            ? "Overview couldn’t load."
            : "Your community, at a glance."}
        </h1>
        <p>
          {pollError || "Loading the latest community and platform snapshots…"}
        </p>
        {pollError && (
          <button
            className="inspector-button"
            onClick={() => void fetchOverview()}
          >
            Retry analytics
          </button>
        )}
      </div>
    );
  const ops = data.ops && !data.ops.error ? data.ops : null;
  const totals = data.totals;
  const memory = ops?.server?.memory;
  const trendGroups = {
    community: [
      ["Members", (s) => s.totals?.users, number],
      ["Posts", (s) => s.totals?.posts, number],
      ["Comments", (s) => s.totals?.comments, number],
    ],
    roles: [
      ["Administrators", (s) => s.totals?.admins, number],
      ["Moderators", (s) => s.totals?.moderators, number],
      ["Banned accounts", (s) => s.totals?.banned, number],
    ],
    memory: [
      ["Resident memory", (s) => s.ops?.server?.memory?.rss, bytes],
      ["Heap used", (s) => s.ops?.server?.memory?.heapUsed, bytes],
    ],
    platform: [
      ["Database size", (s) => s.ops?.storage?.databaseSizeBytes, bytes],
      ["Active sessions", (s) => s.ops?.database?.activeSessions, number],
      ["Audit events", (s) => s.ops?.database?.auditLogRows, number],
    ],
  };
  const rangeStart = history[0]?.ts;

  return (
    <div className="overview">
      <header className="overview-heading">
        <div>
          <p className="overview-eyebrow">COMMUNITY / OVERVIEW</p>
          <h1>
            Your community,
            <br />
            at a glance.
          </h1>
          <p className="overview-caption">
            The conversations, people and systems behind CCS Talks.
          </p>
        </div>
        <div className="overview-update">
          <span className="overview-live">
            <i aria-hidden="true" />
            Live snapshots
          </span>
          <p>
            Updated{" "}
            <time dateTime={new Date(lastRefresh).toISOString()}>
              {new Date(lastRefresh).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </p>
          <button
            className="inspector-button quiet"
            onClick={() => void fetchOverview()}
          >
            <AdminGlyph name="refresh" size={14} />
            Refresh now
          </button>
        </div>
      </header>
      {pollError && (
        <div className="overview-error" role="alert">
          Refresh failed: {pollError} Your last snapshot is still shown.
        </div>
      )}

      <section className="overview-metrics" aria-label="Community totals">
        <Metric
          title="Members"
          value={totals.users}
          hint="People in your community"
          metric="users"
          icon="users"
          history={history}
        />
        <Metric
          title="Posts"
          value={totals.posts}
          hint="Conversations started"
          metric="posts"
          icon="posts"
          history={history}
        />
        <Metric
          title="Comments"
          value={totals.comments}
          hint="Replies and perspectives"
          metric="comments"
          icon="tickets"
          history={history}
        />
        <div className="overview-roles">
          <span>Community roles</span>
          <dl>
            <Reading label="Administrators" value={number(totals.admins)} />
            <Reading label="Moderators" value={number(totals.moderators)} />
            <Reading label="Banned accounts" value={number(totals.banned)} />
          </dl>
        </div>
      </section>

      {ops && (
        <nav className="overview-work-links" aria-label="Work awaiting staff">
          <button
            type="button"
            onClick={() => onNavigate("reports", null, { status: "open" })}
          >
            <span>Open reports</span>
            <strong>{number(ops.database.openReports)}</strong>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("tickets", null, { status: "open" })}
          >
            <span>Open support tickets</span>
            <strong>{number(ops.database.ticketsOpen)}</strong>
          </button>
          <span className="overview-caption">Your moderation queues</span>
        </nav>
      )}
      <div className="overview-main-grid">
        <section
          className="overview-trends"
          aria-labelledby="overview-trends-title"
        >
          <header className="overview-section-head">
            <div>
              <p className="overview-eyebrow">THE LIVE PICTURE</p>
              <h2 id="overview-trends-title">Realtime trends</h2>
            </div>
            <span className="overview-caption">
              {history.length} {history.length === 1 ? "sample" : "samples"}{" "}
              this visit
            </span>
          </header>
          <TrendExplorer groups={trendGroups} history={history} />
          <p className="overview-footnote">
            {rangeStart
              ? `Since ${new Date(rangeStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · `
              : ""}
            Refreshes every 14 seconds while visible. Charts show snapshots from
            this visit; runtime values describe the responding worker.
          </p>
        </section>
        <section
          className="overview-activity"
          aria-labelledby="overview-activity-title"
        >
          <header className="overview-section-head">
            <div>
              <p className="overview-eyebrow">STAFF JOURNAL</p>
              <h2 id="overview-activity-title">Recent activity</h2>
            </div>
            <AdminGlyph name="audit" size={18} />
          </header>
          {!data.recentAudit.length ? (
            <div className="overview-empty">
              <span className="overview-empty-icon">
                <AdminGlyph name="audit" size={24} />
              </span>
              <h3>A quiet moment.</h3>
              <p>Staff actions will appear here as your community grows.</p>
            </div>
          ) : (
            <ol className="overview-activity-list">
              {data.recentAudit.map((entry) => (
                <li key={entry.id}>
                  <span className="overview-event-dot" aria-hidden="true" />
                  <div>
                    <strong>{entry.action.replaceAll("_", " ")}</strong>
                    <p>
                      <span>By {entry.actorId}</span>
                      {entry.targetId && <span>For {entry.targetId}</span>}
                    </p>
                    <time dateTime={new Date(entry.createdAt).toISOString()}>
                      {new Date(entry.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section
        aria-labelledby="overview-platform-title"
        className="overview-platform"
      >
        <header className="overview-section-head">
          <div>
            <p className="overview-eyebrow">BEHIND THE SCENES</p>
            <h2 id="overview-platform-title">Platform health</h2>
          </div>
          <span className="overview-caption">
            Database diagnostics sampled every 60s
          </span>
        </header>
        {ops ? (
          <>
            <div className="overview-diagnostics">
              <Diagnostic
                title="Runtime"
                caption="Responding server instance"
                chart={
                  <Sparkline
                    label="Worker uptime"
                    values={series(
                      history,
                      (s) => s.ops?.server?.uptimeSeconds,
                    )}
                    format={duration}
                  />
                }
              >
                <Reading label="Node" value={ops.server.node} />
                <Reading label="Platform" value={ops.server.platform} />
                <Reading label="Process" value={number(ops.server.pid)} />
                <Reading
                  label="Uptime"
                  value={duration(ops.server.uptimeSeconds)}
                />
                <Reading label="Time zone" value={ops.server.timeZone || "—"} />
              </Diagnostic>
              <Diagnostic title="Memory" caption="Current process footprint">
                <Reading label="Resident (RSS)" value={bytes(memory.rss)} />
                <Reading label="Heap used" value={bytes(memory.heapUsed)} />
                <Reading
                  label="Heap capacity"
                  value={bytes(memory.heapTotal)}
                />
                <Reading label="External" value={bytes(memory.external)} />
                <div className="overview-heap">
                  <dt>Heap utilisation</dt>
                  <dd>
                    {memory.heapTotal > 0
                      ? `${Math.round((memory.heapUsed / memory.heapTotal) * 100)}%`
                      : "—"}
                  </dd>
                  <div
                    role="meter"
                    aria-label="Heap utilisation"
                    aria-valuenow={
                      memory.heapTotal > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (memory.heapUsed / memory.heapTotal) * 100,
                            ),
                          )
                        : 0
                    }
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <i
                      style={{
                        width: `${memory.heapTotal > 0 ? Math.min(100, (memory.heapUsed / memory.heapTotal) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </Diagnostic>
              <Diagnostic
                title="Postgres"
                caption="Storage, including indexes"
                chart={
                  <Sparkline
                    label="Relation storage"
                    values={series(
                      history,
                      (s) => s.ops?.storage?.relationStorageBytes,
                    )}
                    format={bytes}
                  />
                }
              >
                <Reading
                  label="Database"
                  value={bytes(ops.storage.databaseSizeBytes)}
                />
                <Reading
                  label="Relations"
                  value={bytes(ops.storage.relationStorageBytes)}
                />
                <Reading
                  label="Post text"
                  value={bytes(ops.storage.postsTextBytes)}
                />
                <Reading
                  label="Comment text"
                  value={bytes(ops.storage.commentsTextBytes)}
                />
              </Diagnostic>
              <Diagnostic
                title="Community operations"
                caption="Database snapshot"
              >
                <Reading
                  label="Active sessions"
                  value={number(ops.database.activeSessions)}
                  note={`${number(ops.database.sessionsTotal)} total`}
                />
                <Reading
                  label="Announcements"
                  value={number(ops.database.announcements)}
                />
                <Reading
                  label="Support tickets"
                  value={number(ops.database.tickets)}
                  note={`${number(ops.database.ticketsOpen)} open`}
                />
                <Reading
                  label="Audit events"
                  value={number(ops.database.auditLogRows)}
                />
              </Diagnostic>
            </div>
            <details className="overview-connections">
              <summary>
                <span>
                  <AdminGlyph name="site" size={16} />
                  Connections &amp; configuration
                </span>
                <span className="overview-caption">Deployment details</span>
              </summary>
              <div className="overview-config-grid">
                <Configuration
                  label="Transactional email"
                  enabled={ops.integrations.transactionalEmail}
                >
                  RESEND_API_KEY
                </Configuration>
                <Configuration
                  label="Public app URL"
                  enabled={ops.integrations.publicAppUrl}
                >
                  CCS_PUBLIC_URL / NEXT_PUBLIC_APP_URL / Vercel
                </Configuration>
                <Configuration
                  label="Auth pepper"
                  enabled={ops.integrations.authPepperSet}
                  off="Optional"
                >
                  CCS_AUTH_PEPPER
                </Configuration>
                <div className="overview-config-row">
                  <span>Admin self-registration</span>
                  <span className="overview-config-state ready">Disabled</span>
                  <small>Owner-managed staff access</small>
                </div>
              </div>
              <p className="overview-footnote">
                Database host: <code>{ops.database.hostMasked}</code>
              </p>
              <p className="overview-footnote">{ops.api.note}</p>
            </details>
          </>
        ) : (
          <p className="overview-error" role="status">
            {data.ops?.error ||
              "Platform diagnostics are unavailable for this snapshot."}
          </p>
        )}
      </section>

      <details className="overview-data">
        <summary>
          View snapshot data{" "}
          <span className="overview-caption">Accessible chart values</span>
        </summary>
        <div className="overview-table-wrap">
          <table>
            <caption>
              Snapshots collected during this visit. Database diagnostics can
              repeat within their 60-second sampling window.
            </caption>
            <thead>
              <tr>
                {[
                  "Time",
                  "Members",
                  "Admins",
                  "Moderators",
                  "Banned",
                  "Posts",
                  "Comments",
                  "RSS",
                  "Heap used",
                  "Database",
                  "Sessions",
                  "Audit",
                  "Uptime",
                  "Relations",
                ].map((label) => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((sample, index) => (
                <tr key={`${sample.ts}-${index}`}>
                  <th scope="row">
                    {new Date(sample.ts).toLocaleTimeString()}
                  </th>
                  {[
                    sample.totals?.users,
                    sample.totals?.admins,
                    sample.totals?.moderators,
                    sample.totals?.banned,
                    sample.totals?.posts,
                    sample.totals?.comments,
                  ].map((value, i) => (
                    <td key={i}>{number(value)}</td>
                  ))}
                  <td>{bytes(sample.ops?.server?.memory?.rss)}</td>
                  <td>{bytes(sample.ops?.server?.memory?.heapUsed)}</td>
                  <td>{bytes(sample.ops?.storage?.databaseSizeBytes)}</td>
                  <td>{number(sample.ops?.database?.activeSessions)}</td>
                  <td>{number(sample.ops?.database?.auditLogRows)}</td>
                  <td>
                    {sample.ops
                      ? duration(sample.ops.server.uptimeSeconds)
                      : "—"}
                  </td>
                  <td>{bytes(sample.ops?.storage?.relationStorageBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function TrendExplorer({ groups, history }) {
  const [selected, setSelected] = useState("community");
  return (
    <>
      <div
        className="overview-segments"
        role="group"
        aria-label="Trend category"
      >
        {[
          ["community", "Community"],
          ["roles", "Roles"],
          ["memory", "Memory"],
          ["platform", "Platform"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={selected === key}
            onClick={() => setSelected(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="overview-trend-grid">
        {groups[selected].map(([label, pick, format]) => (
          <Trend
            key={label}
            label={label}
            values={series(history, pick)}
            format={format}
          />
        ))}
      </div>
    </>
  );
}
