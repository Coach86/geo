"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Eye,
  Compass,
  Heart,
  Shield,
  Swords,
  Lightbulb,
  Home,
  Building2,
  SlidersHorizontal,
} from "lucide-react";
import {
  ProjectResponse,
} from "@/lib/auth-api";
import DomainSelector from "./domain-selector";
import { useNavigation } from "@/providers/navigation-provider";

interface SidebarItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
}

const insightsMenuItems: SidebarItem[] = [
  { label: "Visibility", icon: Eye, href: "/visibility" },
  { label: "Sentiment", icon: Heart, href: "/sentiment" },
  { label: "Alignment", icon: Shield, href: "/alignment" },
  { label: "Competition", icon: Swords, href: "/battle" },
  { label: "Explorer", icon: Compass, href: "/explorer" },
];

const optimizationMenuItems: SidebarItem[] = [
  { label: "Recommendations", icon: Lightbulb, href: "/recommendations" },
];

interface SidebarProps {
  identityCards: ProjectResponse[];
  selectedProject: ProjectResponse | null;
  onProjectSelect: (project: ProjectResponse) => void;
  variant?: 'project' | 'global';
}

export default function Sidebar({
  identityCards,
  selectedProject,
  onProjectSelect,
  variant = 'project',
}: SidebarProps) {
  const pathname = usePathname();
  const { selectedDomain, setSelectedDomain } = useNavigation();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-60 flex-col border-r bg-white shadow-sm">
      {/* Logo/Header */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <img src={"/logo-small.png"} className="w-24" />
      </div>

      {/* Domain Selector */}
      <DomainSelector
        projects={identityCards}
        selectedDomain={selectedDomain}
        onDomainSelect={setSelectedDomain}
      />

      {/* Home Link - Always visible */}
      <div className="px-2 py-2 border-b">
        <Link
          href="/home"
          className={`
            flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
            ${
              pathname === "/home"
                ? "bg-accent-50 text-accent-700"
                : "text-dark-600 hover:bg-dark-50"
            }
          `}
        >
          <Home
            className={`w-5 h-5 ${
              pathname === "/home" ? "text-accent-600" : "text-dark-400"
            }`}
          />
          <span className="flex-1">Home</span>
        </Link>
      </div>

      {/* Navigation */}
      {variant === 'project' && (
        <nav className="flex-1 overflow-y-auto py-4 px-2">

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
      )}
      {variant === 'global' && <div className="flex-1" />}

      {/* Bottom Actions - Fixed at bottom */}
      <div className="border-t">
        {/* Settings Links */}
        <div className="p-4 space-y-2">
          {variant === 'project' ? (
            <Link
              href="/project-settings"
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                ${
                  pathname === "/project-settings"
                    ? "bg-purple-50 text-purple-700"
                    : "text-dark-600 hover:bg-dark-50"
                }
              `}
            >
              <SlidersHorizontal
                className={`w-5 h-5 ${
                  pathname === "/project-settings" ? "text-purple-600" : "text-dark-400"
                }`}
              />
              <span className="flex-1">Project Settings</span>
            </Link>
          ) : (
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
              <Building2
                className={`w-5 h-5 ${
                  pathname === "/settings" ? "text-accent-600" : "text-dark-400"
                }`}
              />
              <span className="flex-1">Account</span>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
