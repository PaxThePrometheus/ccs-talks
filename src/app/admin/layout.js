export const metadata = {
  title: "CCS Talks · Admin",
  description: "Operational console for CCS Talks moderators and administrators.",
};

export default function AdminLayout({ children }) {
  return (
    <div
      className="ccs-admin-shell ccs-admin-bar-scroll"
      style={{
        minHeight: "100vh",
        maxHeight: "100vh",
        overflowY: "auto",
        background: "#0a0006",
        color: "#f4ecec",
        fontFamily: "var(--font-geist-sans, system-ui)",
      }}
    >
      {children}
    </div>
  );
}
