import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Seal, VWordmark } from "@/components/brand/Seal";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--obsidian)",
          borderBottom: "1px solid var(--hair)",
        }}
      >
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            height: 64,
            padding: "0 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <Link
              href="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "var(--fg)",
                textDecoration: "none",
              }}
            >
              <Seal size={22} />
              <VWordmark />
            </Link>
            <nav style={{ display: "flex", gap: 28 }}>
              <Link
                href="/dashboard"
                style={{
                  color: "var(--fg)",
                  fontSize: 13,
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                }}
              >
                Filings
              </Link>
              <Link
                href="/audit"
                style={{
                  color: "var(--fg-3)",
                  fontSize: 13,
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                }}
              >
                Audit
              </Link>
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <OrganizationSwitcher hidePersonal />
            <UserButton />
          </div>
        </div>
      </header>
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}
