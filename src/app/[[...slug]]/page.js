import { notFound } from "next/navigation";
import CCSTalksApp from "@/components/ccs-talks/CCSTalksApp";
import { validateTalksSlugSegments } from "@/components/ccs-talks/routing/talksPaths";

/** Every public Talks UI share this client shell (`/forum`, `/profile/me`, `/p/…`, …). */
export default async function TalksSlugPage({ params }) {
  const resolved = params instanceof Promise ? await params : params;
  const slug = resolved?.slug;
  const v = validateTalksSlugSegments(slug);
  if (!v.ok) notFound();
  return <CCSTalksApp />;
}
