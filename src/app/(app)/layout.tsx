import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { WordmarkInline } from "@/components/brand/Wordmark";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b hairline bg-paper">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <WordmarkInline />
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/dashboard" className="text-ink hover:text-gold-2">
                Documents
              </Link>
              <Link href="/audit" className="text-muted hover:text-ink">
                Audit
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <OrganizationSwitcher
              hidePersonal
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "border hairline rounded-sm px-3 py-1.5 text-sm",
                },
              }}
            />
            <UserButton />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
