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
        <img src={"/logo-small.png"} className="w-24" />
      </div>

      {/* Company Selector */}
      <div className="px-4 py-4 border-b">
        <label className="text-xs font-semibold text-dark-500 uppercase tracking-widest mb-2 block">
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
              <Building2 className="w-4 h-4 text-dark-500" />
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
          <div className="px-3 mb-2 text-xs font-semibold text-dark-500 tracking-widest uppercase">
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
                          ? "bg-accent-50 text-accent-700"
                          : "text-dark-600 hover:bg-dark-50"
                      }
                    `}
                  >
                    <item.icon
                      className={`w-5 h-5 ${
                        isActive ? "text-accent-600" : "text-dark-400"
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto inline-block rounded bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700">
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
          <div className="px-3 mb-2 text-xs font-semibold text-dark-500 tracking-widest uppercase">
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
                          ? "bg-accent-50 text-accent-700"
                          : "text-dark-600 hover:bg-dark-50"
                      }
                    `}
                  >
                    <item.icon
                      className={`w-5 h-5 ${
                        isActive ? "text-accent-600" : "text-dark-400"
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto inline-block rounded bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700">
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
