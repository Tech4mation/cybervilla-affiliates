"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signoutUser, type AuthUser } from "@/lib/api";

/**
 * Keeps a section of the dashboard to the accounts entitled to it.
 *
 * This is a convenience, not a security boundary — the browser is not a place
 * to enforce anything. Every endpoint behind these pages is guarded server
 * side; this only stops someone typing /admin and being shown a shell of a
 * page whose data never arrives.
 */
/** An affiliate may only use the dashboard once an admin has let them in. */
const ACTIVE = new Set(["approved", "active"]);

export function RequireRole({
  role,
  children,
}: {
  role: AuthUser["role"];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "allowed" | "denied" | "inactive">("checking");
  const [account, setAccount] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then(({ user }) => {
        if (cancelled) return;
        setAccount(user);
        if (user.role !== role) {
          setState("denied");
          router.replace(user.role === "admin" ? "/admin" : "/dashboard");
          return;
        }
        // Role alone is not enough. A pending, rejected or suspended affiliate
        // has a valid token but no access, and every page behind here would
        // just render its own "could not load" error.
        if (role === "affiliate" && !ACTIVE.has(user.status)) {
          setState("inactive");
          return;
        }
        setState("allowed");
      })
      .catch(() => {
        if (cancelled) return;
        setState("denied");
        router.replace("/signin");
      });
    return () => {
      cancelled = true;
    };
  }, [role, router]);

  if (state === "allowed") return <>{children}</>;

  if (state === "inactive" && account) return <AccountNotActive user={account} />;

  return (
    <div className="p-8 text-center text-sm text-muted">
      {state === "checking" ? "Checking your account…" : "Taking you to the right place…"}
    </div>
  );
}

function AccountNotActive({ user }: { user: AuthUser }) {
  const router = useRouter();
  const rejected = user.status === "rejected";
  const suspended = user.status === "suspended";

  const title = rejected
    ? "Your application was not approved"
    : suspended
      ? "Your account is suspended"
      : "Your account is awaiting approval";

  const body = rejected
    ? user.rejectionReason ||
      "The CyberVilla team reviewed your application and did not approve it."
    : suspended
      ? "Your affiliate account has been suspended, so the dashboard is unavailable. Please contact CyberVilla."
      : "Someone at CyberVilla still needs to approve your application. You'll be able to create links and track earnings as soon as that happens.";

  async function handleSignOut() {
    await signoutUser().catch(() => undefined);
    router.replace("/signin");
  }

  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <button
          onClick={handleSignOut}
          className="mt-5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
