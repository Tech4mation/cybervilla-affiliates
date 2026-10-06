"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Clock, ArrowRight } from "lucide-react";
import { signupAffiliate, setStoredToken, ApiError } from "@/lib/api";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whyJoin, setWhyJoin] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [applicantName, setApplicantName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signupAffiliate({
        name,
        email,
        whyJoin,
        phone,
        password,
      });

      if (res.token) {
        setStoredToken(res.token);
      }
      setApplicantName(res.user?.name || name);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not complete registration. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl">
              <Image src="/images/Login-bg.png" alt="CyberVilla" fill sizes="40px" className="object-cover" priority />
            </span>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Cyber<span className="text-brand-gradient">Villa</span> Affiliates
            </span>
          </Link>
          <p className="text-sm text-muted mt-2 text-center">
            Apply to promote products and earn markup commissions
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          {success ? (
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock size={28} />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Application Received</h2>
              <p className="text-xs text-muted leading-relaxed">
                Thank you, <strong className="text-foreground">{applicantName}</strong>! Your affiliate application has been submitted and is currently <span className="font-semibold text-amber-400">pending admin approval</span>.
              </p>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left text-xs text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-200">
                  <AlertCircle size={14} /> Approval Required
                </div>
                <p className="text-muted">
                  Sign-ups do not become members of the affiliate program until approved by the admin. Once approved, you can generate affiliate links and earn commissions.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/signin"
                  className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-surface-2 border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-border transition"
                >
                  Go to Sign In <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Notice Banner */}
              <div className="mb-6 rounded-xl border border-accent/25 bg-accent/5 p-3.5 flex gap-2.5 text-xs text-muted">
                <Clock size={16} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Approval Required: </span>
                  Sign-ups do not become members of the affiliate program until approved by the admin.
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Tomiwa Adebayo"
                      className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tomiwa@example.com"
                      className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Why do you want to join? *</label>
                  <textarea
                    required
                    rows={3}
                    value={whyJoin}
                    onChange={(e) => setWhyJoin(e.target.value)}
                    placeholder="Tell us about your audience focus and how you plan to promote CyberVilla products..."
                    className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow hover:opacity-95 disabled:opacity-50 transition cursor-pointer mt-2"
                >
                  {loading ? "Submitting Application…" : "Submit Affiliate Application"}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-muted">
                Already registered?{" "}
                <Link href="/signin" className="font-medium text-accent hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
