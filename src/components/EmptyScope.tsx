"use client";

import { CreateOrganization } from "@clerk/nextjs";

/**
 * Rendered when an authenticated user has no active Clerk organization.
 * Inline `CreateOrganization` lets them name their firm and proceed
 * without bouncing back to a separate flow.
 */
export function EmptyScope() {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "72px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--gold)",
        }}
      >
        Name your firm
      </div>
      <h2
        style={{
          marginTop: 12,
          fontFamily: "var(--font-serif)",
          fontSize: 44,
          fontWeight: 400,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
        }}
      >
        Veritas is multi-tenant.
      </h2>
      <p
        style={{
          marginTop: 16,
          color: "var(--fg-2)",
          lineHeight: 1.6,
          fontSize: 15,
        }}
      >
        Every filing, citation, and audit trail is scoped per firm.
        Create yours below to continue.
      </p>
      <div style={{ marginTop: 40, display: "flex", justifyContent: "center" }}>
        <CreateOrganization
          afterCreateOrganizationUrl="/dashboard"
          skipInvitationScreen
        />
      </div>
    </div>
  );
}
