"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/prompt", label: "Prompt" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/conversations", label: "Conversations" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/test-chat", label: "Test Chat" },
  { href: "/admin/insights", label: "Insights" },
  { href: "/admin/images", label: "UI Customization", icon: true },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-admin-bg">
      {/* White shimmer top bar */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      {/* Frosted glass navigation */}
      <nav className="sticky top-0 z-50 glass-nav border-b border-ui px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2 sm:mb-0">
            <h1 className="font-serif text-lg font-bold">
              <span className="gradient-text">Tessra</span>{" "}
              <span className="text-accent/70 text-sm font-sans font-normal">
                Admin
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={handleSignOut}
                className="rounded-md px-3 py-1.5 text-xs text-foreground/50 hover:text-foreground border border-transparent hover:border-ui transition-all duration-200"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto -mx-1 px-1 sm:mt-2">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-all duration-300 ${
                    isActive
                      ? "bg-ui-2 text-foreground border border-ui-strong"
                      : "text-foreground/55 hover:text-foreground hover-bg-ui-2 border border-transparent"
                  }`}
                >
                  {item.icon && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                    </svg>
                  )}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in-up">
        {children}
      </main>
    </div>
  );
}
