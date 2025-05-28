"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  User,
  Eye,
  Quote,
  Heart,
  Shield,
  Swords,
  Building2,
  Settings,
  Plus,
  Lightbulb,
} from "lucide-react";
import { 
  IdentityCardResponse, 
  getUserProfile, 
  createCompanyFromUrl 
} from "@/lib/auth-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddCompanyModal from "@/components/AddCompanyModal";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

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
  { label: "Arena", icon: Swords, href: "/battle" },
];

const optimizationMenuItems: SidebarItem[] = [
  { label: "Recommendations", icon: Lightbulb, href: "/recommendations" },
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
  const router = useRouter();
  const { token } = useAuth();
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile to check plan limits
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const profile = await getUserProfile(token);
        setUserProfile(profile);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };
    fetchProfile();
  }, [token]);

  const handleAddCompanyClick = () => {
    if (!userProfile) {
      setIsAddCompanyModalOpen(true);
      return;
    }

    const currentBrandCount = identityCards.length;
    const maxBrands = userProfile.planSettings?.maxBrands || 1;

    if (currentBrandCount >= maxBrands) {
      // Redirect to update plan page
      router.push("/update-plan");
    } else {
      setIsAddCompanyModalOpen(true);
    }
  };

  const handleCreateCompany = async (data: {
    url: string;
    market: string;
    language: string;
  }) => {
    if (!token) throw new Error("Not authenticated");
    
    const result = await createCompanyFromUrl(data, token);
    return result;
  };

  const handleCompanyCreated = (companyId: string) => {
    // Reload the page to refresh the company list
    window.location.reload();
  };

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
        <div className="mb-6">
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

        {/* Optimization Section */}
        <div className="mb-4">
          <div className="px-3 mb-2 text-xs font-semibold text-dark-500 tracking-widest uppercase">
            Optimization
          </div>
          <ul className="space-y-1">
            {optimizationMenuItems.map((item) => {
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

      {/* Bottom Actions - Fixed at bottom */}
      <div className="border-t">
        {/* Add Company Button */}
        <div className="p-4 pb-2">
          <button
            onClick={handleAddCompanyClick}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors bg-primary-50 text-primary-700 hover:bg-primary-100 w-full"
          >
            <Plus className="w-5 h-5 text-primary-600" />
            <span className="flex-1">Add Company</span>
          </button>
        </div>

        {/* Settings Link */}
        <div className="px-4 pb-4">
          <Link
            href="/settings"
            className={`
              flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
              ${
                pathname === "/settings"
                  ? "bg-accent-50 text-accent-700"
                  : "text-dark-600 hover:bg-dark-50"
              }
            `}
          >
            <Settings
              className={`w-5 h-5 ${
                pathname === "/settings" ? "text-accent-600" : "text-dark-400"
              }`}
            />
            <span className="flex-1">Settings</span>
          </Link>
        </div>
      </div>
      
      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setIsAddCompanyModalOpen(false)}
        onSuccess={handleCompanyCreated}
        onCreateCompany={handleCreateCompany}
      />
    </aside>
  );
}
