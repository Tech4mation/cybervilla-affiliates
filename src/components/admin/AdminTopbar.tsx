"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav";
import { getCurrentUser, signoutUser } from "@/lib/api";

export function AdminTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const current = [...ADMIN_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  useEffect(() => {
    getCurrentUser()
      .then(({ user }) => setUser({ name: user.name, email: user.email, role: user.role }))
      .catch(() => undefined);
  }, []);

  async function handleLogout() {
    await signoutUser().catch(() => undefined);
    router.replace("/signin");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-foreground sm:text-lg">{current?.label ?? "Overview"}</h1>
        <span className="hidden items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent sm:inline-flex">
          <ShieldCheck size={12} /> Admin mode
        </span>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell href="/admin/notifications" />
        {user && (
          <>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
              {user.name.split(" ").map((n) => n[0]).join("")}
            </span>
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-tight text-foreground">{user.name}</p>
              <p className="text-[11px] leading-tight text-muted">{user.role}</p>
            </div>
          </>
        )}
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
