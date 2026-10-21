import { signIn } from "@/lib/ccs/loginHandler";

export const dynamic = "force-dynamic";

export async function POST(request) {
  return signIn(request, true);
}
