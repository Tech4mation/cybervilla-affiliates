import { AdminShell } from "@/components/admin/AdminShell";
import { RequireRole } from "@/components/layout/RequireRole";
import { AppDataProvider } from "@/lib/store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // AppDataProvider loads the affiliate roster, which only an admin may read —
  // so it lives here rather than in the root layout, where it fired on every
  // page including sign-in.
  return (
    <RequireRole role="admin">
      <AppDataProvider>
        <AdminShell>{children}</AdminShell>
      </AppDataProvider>
    </RequireRole>
  );
}
