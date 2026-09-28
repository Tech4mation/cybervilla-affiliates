import { Shell } from "@/components/layout/Shell";
import { RequireRole } from "@/components/layout/RequireRole";

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="affiliate">
      <Shell>{children}</Shell>
    </RequireRole>
  );
}
