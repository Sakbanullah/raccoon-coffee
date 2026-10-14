import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Tags,
  MapPin,
  CalendarDays,
  Newspaper,
  Image as Images,
  ImagePlus,
  Settings,
  Eye,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** Admin navigation tree. Single source of truth for sidebar + header titles. */
export const ADMIN_NAV: NavGroup[] = [
  { items: [{ label: "Overview", href: "/admin", icon: LayoutDashboard }] },
  {
    label: "Menu Management",
    items: [
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Categories", href: "/admin/categories", icon: Tags },
      { label: "Display Settings", href: "/admin/menu-display", icon: Eye },
    ],
  },
  { items: [{ label: "Branches", href: "/admin/branches", icon: MapPin }] },
  {
    label: "Content Studio",
    items: [
      { label: "Events", href: "/admin/events", icon: CalendarDays },
      { label: "Stories", href: "/admin/stories", icon: Newspaper },
      { label: "Site Images", href: "/admin/site-images", icon: ImagePlus },
    ],
  },
  { items: [{ label: "Raccoon Wall", href: "/admin/raccoon-wall", icon: Images }] },
  { items: [{ label: "Settings", href: "/admin/settings", icon: Settings }] },
];

const FLAT: NavItem[] = ADMIN_NAV.flatMap((g) => g.items);

/** Longest-prefix match so `/admin/products/123` still resolves to Products. */
export function findNavItem(pathname: string): NavItem | undefined {
  return FLAT.filter((i) => pathname === i.href || pathname.startsWith(i.href + "/")).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}
