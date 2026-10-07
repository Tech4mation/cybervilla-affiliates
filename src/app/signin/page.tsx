"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { signinUser, setStoredToken, ApiError, AuthUser } from "@/lib/api";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPendingUser(null);
    setLoading(true);

    try {
      const res = await signinUser({ email, password });
      if (res.token) {
        setStoredToken(res.token);
      }

      const user = res.user;

      if (user.role === "admin") {
        router.push("/admin");
        return;
      }

      if (user.status === "pending") {
        setPendingUser(user);
        return;
      }

      if (user.status === "rejected") {
        setError(`Your application was not approved: ${user.rejectionReason || "Application declined."}`);
        return;
      }

      // Approved affiliate member
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not sign in. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl">
              <Image src="/images/Login-bg.png" alt="CyberVilla" fill sizes="40px" className="object-cover" priority />
            </span>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Cyber<span className="text-brand-gradient">Villa</span> Affiliates
            </span>
          </Link>
          <p className="text-sm text-muted mt-2 text-center">
            Sign in to access your dashboard or check approval status
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          {pendingUser ? (
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock size={28} />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Account Pending Approval</h2>
              <p className="text-xs text-muted leading-relaxed">
                Welcome back, <strong className="text-foreground">{pendingUser.name}</strong>. Your account is recorded, but sign-ups do not become members of the affiliate program until approved by the admin.
              </p>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left text-xs text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-200">
                  <AlertCircle size={14} /> Review in Progress
                </div>
                <p className="text-muted">
                  Our administrators review all affiliate applications. You will receive access to your referral links and product catalog once your account has been approved.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setPendingUser(null)}
                  className="w-full rounded-xl bg-surface-2 border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-border transition cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Password</label>
                  <PasswordInput
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow hover:opacity-95 disabled:opacity-50 transition cursor-pointer mt-2"
                >
                  {loading ? "Signing In…" : "Sign In"}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-muted">
                Don&apos;t have an affiliate account?{" "}
                <Link href="/signup" className="font-medium text-accent hover:underline">
                  Apply now
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
