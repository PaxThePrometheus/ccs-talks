import { NextResponse } from "next/server";

/** Keep database guard failures actionable without exposing SQL or credentials. */
export function staffRoute(handler) {
  return async (...args) => {
    try { const response=await handler(...args); response.headers.set("Cache-Control","no-store"); return response; }
    catch (error) {
      if (error?.status >= 400 && error.status < 500) return NextResponse.json({ error: error.message }, { status: error.status });
      const code = error?.cause?.code || error?.code;
      if (code === "23514") return NextResponse.json({ error: "This change would remove the last active administrator." }, { status: 409 });
      console.error("Staff request failed", { code: code || "unknown" });
      return NextResponse.json({ error: "The request could not be completed. Please retry." }, { status: 503 });
    }
  };
}
