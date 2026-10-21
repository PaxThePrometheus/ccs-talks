export const dynamic = "force-dynamic";

/** Public capability information only; never disclose database/account counts. */
export async function GET() {
  return Response.json(
    { bootstrap: false, inviteRequired: false, registrationOpen: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
