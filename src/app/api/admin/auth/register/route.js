export const dynamic = "force-dynamic";

/** Closed regardless of database state, session, body, or legacy invite code. */
export async function POST() {
  return Response.json(
    { error: "Admin self-registration is disabled. Ask an existing administrator to promote your account." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
