"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/prompt", label: "Prompt" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/conversations", label: "Conversations" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0d1428" }}>
      {/* Gold top bar */}
      <div className="h-1 bg-accent" />

      {/* Navigation */}
      <nav className="border-b border-foreground/10 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2 sm:mb-0">
            <h1 className="font-serif text-lg font-bold">
              Socratic.sg{" "}
              <span className="text-accent text-sm font-sans font-normal">
                Admin
              </span>
            </h1>
            <Link
              href="/chat"
              className="text-sm text-foreground/40 hover:text-foreground transition-colors"
            >
              Back to Chat
            </Link>
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
                  className={`rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
