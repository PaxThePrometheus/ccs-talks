import { redirect } from "next/navigation";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { bootstrapStatus, requireStaff } from "@/lib/ccs/admin";
import { AdminConsole } from "@/components/ccs-admin/AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await ensureReady();

  const status = await bootstrapStatus();
  if (status.bootstrap) redirect("/admin/register");

  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error === "unauthorized") redirect("/admin/login");
  if (gate.error) {
    return (
      <main style={shell}>
        <h1 style={h1}>Forbidden</h1>
        <p style={p}>This account does not have staff privileges.</p>
        <a href="/admin/login" style={link}>Sign in with another account</a>
      </main>
    );
  }

  return (
    <AdminConsole
      viewer={{
        id: gate.row.id,
        email: gate.row.email,
        role: gate.row.role,
        name: gate.row.profile?.name || gate.row.email,
      }}
      inviteRequired={status.inviteRequired}
    />
  );
}

const shell = { maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem", color: "#f4ecec" };
const h1 = { fontSize: 28, fontWeight: 950, letterSpacing: "-0.5px", margin: "0 0 8px" };
const p = { color: "rgba(240,220,220,0.7)", margin: "0 0 16px", fontSize: 14 };
const link = { color: "#ff6080", fontWeight: 800, textDecoration: "none" };
