"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Extract orgSlug from path: /client/[orgSlug]/...
  const orgSlug = pathname.split("/")[2] ?? "";

  return (
    <div className="min-h-screen bg-admin-bg">
      {/* White shimmer top bar */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 glass-nav border-b border-ui px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2 sm:mb-0">
            <h1 className="font-serif text-lg font-bold">
              <span className="gradient-text">Tessra</span>{" "}
              <span className="text-accent/70 text-sm font-sans font-normal">
                Dashboard
              </span>
            </h1>
            <ThemeToggle />
          </div>
          {orgSlug && (
            <div className="flex gap-1 sm:mt-2">
              <Link
                href={`/client/${orgSlug}`}
                className={`rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-all duration-300 border ${
                  pathname === `/client/${orgSlug}`
                    ? "bg-ui-2 text-foreground border-ui-strong"
                    : "text-foreground/55 hover:text-foreground hover-bg-ui-2 border-transparent"
                }`}
              >
                Overview
              </Link>
              <Link
                href={`/client/${orgSlug}/insights`}
                className={`rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-all duration-300 border ${
                  pathname.startsWith(`/client/${orgSlug}/insights`)
                    ? "bg-ui-2 text-foreground border-ui-strong"
                    : "text-foreground/55 hover:text-foreground hover-bg-ui-2 border-transparent"
                }`}
              >
                Insights
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in-up">
        {children}
      </main>
    </div>
  );
}
