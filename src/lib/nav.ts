import {
  LayoutDashboard,
  Package,
  Link2,
  Tag,
  Receipt,
  Wallet,
  Bell,
  LifeBuoy,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products & Offers", href: "/products", icon: Package },
  { label: "Links & Codes", href: "/links", icon: Link2 },
  { label: "Campaigns", href: "/campaigns", icon: Tag },
  { label: "Transactions", href: "/transactions", icon: Receipt },
  { label: "Earnings & Payouts", href: "/earnings", icon: Wallet },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Support", href: "/support", icon: LifeBuoy },
  { label: "Account Settings", href: "/settings", icon: Settings },
];
