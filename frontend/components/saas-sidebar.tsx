"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingCart,
  BarChart2,
  Banknote,
  Calendar,
  BookOpen,
  Users,
  Package,
  ClipboardList,
  FileText,
  Mail,
  MessageCircle,
  Folder,
  Briefcase,
  MapPin,
} from "lucide-react";

// Add badge?: string to the item type
interface SidebarItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  active?: boolean;
}

const sections: { label: string; items: SidebarItem[] }[] = [
  {
    label: "OVERVIEW",
    items: [{ label: "Reports", icon: Home, href: "/", active: true }],
  },
  {
    label: "MANAGEMENT",
    items: [
      { label: "Companies", icon: Home, href: "/companies" },
      { label: "Users", icon: Users, href: "/users" },
    ],
  },
];

export default function SaasSidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-60 flex-col border-r bg-white shadow-sm">
      {/* Logo/Header */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <div className="w-7 h-7 rounded bg-green-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="#22C55E" />
          </svg>
        </div>
        <span className="font-bold text-lg tracking-tight text-gray-900">
          Contexte.ai
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {sections.map((section) => (
          <div key={section.label} className="mb-4">
            <div className="px-3 mb-2 text-xs font-semibold text-gray-500 tracking-widest uppercase">
              {section.label}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.label === "App" && pathname === "/");
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                        ${
                          isActive
                            ? "bg-green-50 text-green-700"
                            : "text-gray-700 hover:bg-gray-100"
                        }
                      `}
                    >
                      <item.icon
                        className={`w-5 h-5 ${
                          isActive ? "text-green-600" : "text-gray-400"
                        }`}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
