"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Eye,
  Quote,
  Heart,
  Shield,
  Swords,
  Building2,
} from "lucide-react";
import { IdentityCardResponse } from "@/lib/auth-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SidebarItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
}

const companyMenuItems: SidebarItem[] = [
  { label: "Profile", icon: User, href: "/" },
];

const insightsMenuItems: SidebarItem[] = [
  { label: "Visibility", icon: Eye, href: "/visibility" },
  { label: "Citations", icon: Quote, href: "/citations" },
  { label: "Sentiment", icon: Heart, href: "/sentiment" },
  { label: "Compliance", icon: Shield, href: "/compliance" },
  { label: "Battle", icon: Swords, href: "/battle" },
];

interface SaasSidebarProps {
  identityCards: IdentityCardResponse[];
  selectedCompany: IdentityCardResponse | null;
  onCompanySelect: (company: IdentityCardResponse) => void;
}

export default function SaasSidebar({
  identityCards,
  selectedCompany,
  onCompanySelect,
}: SaasSidebarProps) {
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
          Mint
        </span>
      </div>

      {/* Company Selector */}
      <div className="px-4 py-4 border-b">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
          Select Company
        </label>
        <Select
          value={selectedCompany?.id || ""}
          onValueChange={(value) => {
            const company = identityCards.find((card) => card.id === value);
            if (company) onCompanySelect(company);
          }}
        >
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <SelectValue placeholder="Select a company">
                {selectedCompany?.brandName || "Select a company"}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            {identityCards.map((card) => (
              <SelectItem key={card.id} value={card.id}>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{card.brandName}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {/* Company Section */}
        <div className="mb-6">
          <div className="px-3 mb-2 text-xs font-semibold text-gray-500 tracking-widest uppercase">
            Company
          </div>
          <ul className="space-y-1">
            {companyMenuItems.map((item) => {
              const isActive = pathname === item.href;
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

        {/* Insights Section */}
        <div className="mb-4">
          <div className="px-3 mb-2 text-xs font-semibold text-gray-500 tracking-widest uppercase">
            Insights
          </div>
          <ul className="space-y-1">
            {insightsMenuItems.map((item) => {
              const isActive = pathname === item.href;
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
      </nav>
    </aside>
  );
}
