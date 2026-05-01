import { redirect } from "next/navigation";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { bootstrapStatus, requireStaff } from "@/lib/ccs/admin";
import { AdminLoginForm } from "@/components/ccs-admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  await ensureReady();

  const status = await bootstrapStatus();
  if (status.bootstrap) redirect("/admin/register");

  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (!gate.error) redirect("/admin");

  return <AdminLoginForm />;
}
