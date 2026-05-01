import Link from "next/link";

/** Rendered inside the root layout when `notFound()` is thrown from a Talks route. */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(160deg, #1a0508 0%, #0d0204 45%, #120308 100%)",
        color: "rgba(255, 230, 235, 0.92)",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          textAlign: "center",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(30, 0, 12, 0.55)",
          backdropFilter: "blur(12px)",
          padding: "32px 28px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(255,160,180,0.55)" }}>404</div>
        <h1 style={{ margin: "12px 0 8px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em" }}>Page not found</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "rgba(240, 210, 215, 0.72)" }}>
          That link doesn&apos;t match anything on CCS Talks. Check the URL or head back to the forum.
        </p>
        <Link
          href="/forum"
          style={{
            display: "inline-block",
            marginTop: 22,
            padding: "12px 20px",
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 14,
            textDecoration: "none",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "linear-gradient(135deg, rgba(255,96,128,0.35), rgba(120,0,32,0.65))",
          }}
        >
          Back to forum
        </Link>
      </div>
    </div>
  );
}
