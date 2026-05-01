import { redirect } from "next/navigation";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { bootstrapStatus, requireStaff } from "@/lib/ccs/admin";
import { AdminRegisterForm } from "@/components/ccs-admin/AdminRegisterForm";

export const dynamic = "force-dynamic";

export default async function AdminRegisterPage() {
  await ensureReady();

  const status = await bootstrapStatus();

  /** If already logged in as a staff member, send them to the console. */
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (!gate.error) redirect("/admin");

  return <AdminRegisterForm bootstrap={status.bootstrap} inviteRequired={status.inviteRequired} />;
}
