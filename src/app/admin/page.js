import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { requireStaff } from "@/lib/ccs/admin";
import { InspectorConsole } from "@/components/ccs-admin/InspectorConsole";
import { INSPECTOR_SECTIONS } from "@/components/ccs-admin/inspectorModel.mjs";
import { canAccessSection } from "@/lib/ccs/staffPolicy.mjs";

export const dynamic = "force-dynamic";

export default async function AdminHomePage({ searchParams }) {
  await ensureReady();

  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error === "unauthorized") redirect("/admin/login");
  if (gate.error) {
    return (
      <main style={shell}>
        <h1 style={h1}>Forbidden</h1>
        <p style={p}>This account does not have staff privileges.</p>
        <Link href="/admin/login" style={link}>Sign in with another account</Link>
      </main>
    );
  }

  const query = await searchParams;
  const section = INSPECTOR_SECTIONS.find((item) => item.key === query?.section && canAccessSection(gate.row.role, item.key))?.key || "overview";
  return (
    <InspectorConsole
      initialFilters={Object.fromEntries(["q","status","role","banned","from","to"].map(key=>[key,typeof query?.[key]==="string" ? query[key] : ""]))}
      initialSection={section}
      initialRecordId={typeof query?.record === "string" ? query.record : null}
      viewer={{
        id: gate.row.id,
        email: gate.row.email,
        role: gate.row.role,
        name: gate.row.profile?.name || gate.row.email,
      }}
    />
  );
}

const shell = { maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem", color: "#f4ecec" };
const h1 = { fontSize: 28, fontWeight: 950, letterSpacing: "-0.5px", margin: "0 0 8px" };
const p = { color: "rgba(240,220,220,0.7)", margin: "0 0 16px", fontSize: 14 };
const link = { color: "#ff6080", fontWeight: 800, textDecoration: "none" };
