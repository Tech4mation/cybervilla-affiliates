"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Bell } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { getCurrentUser, signoutUser } from "@/lib/api";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const current = NAV_ITEMS.find((item) => item.href === pathname);

  useEffect(() => {
    getCurrentUser()
      .then(({ user }) => setUser({ name: user.name, email: user.email }))
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
        <h1 className="text-base font-semibold text-foreground sm:text-lg">
          {current?.label ?? "Dashboard"}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/notifications"
          className="relative rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </Link>
        {user && (
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg border border-border py-1 pl-1 pr-3 hover:bg-surface-2"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <span className="hidden text-sm font-medium text-foreground sm:inline">
              {user.name.split(" ")[0]}
            </span>
          </Link>
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
