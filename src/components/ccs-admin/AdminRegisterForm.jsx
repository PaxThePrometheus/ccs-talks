import Link from "next/link";
import { adminTheme as t, card, link, page } from "./adminUi";

/** Public administrator enrollment is unavailable. */
export function AdminRegisterForm() {
  return (
    <main style={page}>
      <section style={card}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", color: t.muted }}>CCS TALKS · ADMIN</div>
        <h1 style={{ fontSize: 26, margin: "8px 0", color: t.textStrong }}>Administrator access</h1>
        <p style={{ color: t.muted, fontSize: 14, lineHeight: 1.6 }}>
          Public administrator registration is closed. Ask an existing administrator to promote your account.
          If this is a new deployment, contact the deployment owner to provision the first administrator.
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 18 }}>
          <Link href="/admin/login" style={link}>Sign in</Link>
          <Link href="/" style={{ ...link, color: t.muted }}>Back to forum</Link>
        </div>
      </section>
    </main>
  );
}
