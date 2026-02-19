"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Heading outside the card */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-bold mb-2 gradient-text">
            Socratic.sg
          </h1>
          <p className="text-foreground/50 text-sm">
            Create your account
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-card rounded-xl p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm mb-1.5 text-foreground/80">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 py-2.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-300 focus:border-accent focus:shadow-[0_0_0_1px_rgba(255,255,255,0.15)] placeholder:text-foreground/30"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-1.5 text-foreground/80">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 py-2.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-300 focus:border-accent focus:shadow-[0_0_0_1px_rgba(255,255,255,0.15)] placeholder:text-foreground/30"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-background transition-all duration-300 hover:bg-accent/85 hover:shadow-[0_0_20px_rgba(255,255,255,0.18)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-foreground/50 mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-accent transition-colors duration-300 hover:text-accent/80 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
