"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Clock, ArrowRight, UserPlus } from "lucide-react";
import { checkReferralCode, signupAffiliate, setStoredToken, ApiError } from "@/lib/api";
import { PasswordInput } from "@/components/ui/PasswordInput";

// useSearchParams needs a Suspense boundary for the page to pre-render.
export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  // An invite link is /signup?ref=<CODE>.
  const initialRef = (useSearchParams().get("ref") ?? "").trim();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whyJoin, setWhyJoin] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [applicantName, setApplicantName] = useState("");
  // The invite code, if someone invited them. Checked as soon as it is known
  // so a typo is caught here rather than silently costing the inviter.
  const [referralCode, setReferralCode] = useState(initialRef);
  const [inviter, setInviter] = useState<string | null>(null);
  const [codeState, setCodeState] = useState<"idle" | "checking" | "valid" | "invalid">(
    initialRef ? "checking" : "idle",
  );

  function applyCheck(res: { valid: boolean; code?: string; inviter?: string }) {
    setCodeState(res.valid ? "valid" : "invalid");
    setInviter(res.valid ? res.inviter ?? null : null);
    if (res.valid && res.code) setReferralCode(res.code);
    return res.valid;
  }

  async function verifyCode(raw: string): Promise<boolean> {
    const code = raw.trim();
    if (!code) {
      setCodeState("idle");
      setInviter(null);
      return true;
    }
    setCodeState("checking");
    try {
      return applyCheck(await checkReferralCode(code));
    } catch {
      // The check could not run; let the server decide on submit.
      setCodeState("idle");
      return true;
    }
  }

  // A code that arrived in the invite link is checked straight away, so
  // "Invited by …" shows before they start typing.
  useEffect(() => {
    if (!initialRef) return;
    checkReferralCode(initialRef)
      .then(applyCheck)
      .catch(() => setCodeState("idle"));
  }, [initialRef]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (referralCode.trim() && codeState !== "valid" && !(await verifyCode(referralCode))) {
      setError("That invite code isn't valid. Check it with the person who invited you, or leave it blank.");
      return;
    }
    setLoading(true);

    try {
      const res = await signupAffiliate({
        name,
        email,
        whyJoin,
        phone,
        password,
        referralCode: referralCode.trim() || undefined,
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

              {inviter && (
                <div className="mb-4 rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-foreground flex items-center gap-2">
                  <UserPlus size={14} className="shrink-0 text-success" />
                  <span>
                    Invited by <strong className="font-semibold">{inviter}</strong>
                  </span>
                </div>
              )}

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

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Invite Code (Optional)</label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => {
                        setReferralCode(e.target.value);
                        setCodeState("idle");
                        setInviter(null);
                      }}
                      onBlur={() => verifyCode(referralCode)}
                      placeholder="e.g. INV-ADA-7K2Q"
                      autoCapitalize="characters"
                      className={`w-full rounded-xl border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none transition ${
                        codeState === "invalid" ? "border-danger focus:border-danger" : "border-border focus:border-accent"
                      }`}
                    />
                    {codeState === "invalid" && (
                      <p className="mt-1 text-xs text-danger">This code isn&apos;t valid.</p>
                    )}
                    {codeState === "checking" && <p className="mt-1 text-xs text-muted">Checking…</p>}
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
                  <PasswordInput
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
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
