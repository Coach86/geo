"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Eye,
  Compass,
  Heart,
  Shield,
  Swords,
  Lightbulb,
  Home,
  SlidersHorizontal,
  Settings,
  FileText,
  Sparkles,
  Target,
} from "lucide-react";
import {
  ProjectResponse,
} from "@/lib/auth-api";
import ProjectSelector from "./project-selector";
import { useNavigation } from "@/providers/navigation-provider";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { usePostHogFlags } from "@/hooks/use-posthog-flags";

interface SidebarItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  feature?: "visibility" | "sentiment" | "alignment" | "competition";
}

const insightsMenuItems: SidebarItem[] = [
  { label: "Visibility", icon: Eye, href: "/visibility", feature: "visibility" },
  { label: "Sentiment", icon: Heart, href: "/sentiment", feature: "sentiment" },
  { label: "Alignment", icon: Shield, href: "/alignment", feature: "alignment" },
  { label: "Competition", icon: Swords, href: "/competition", feature: "competition" },
  { label: "Explorer", icon: Compass, href: "/explorer" },
];

const optimizationMenuItems: SidebarItem[] = [
  { label: "Recommendations", icon: Lightbulb, href: "/recommendations" },
  { label: "Feature Gap", icon: Target, href: "/feature-gap" },
  { label: "Page Intelligence", icon: FileText, href: "/content-kpi", badge: "alpha" },
  { label: "Page Magic", icon: Sparkles, href: "/page-magic", badge: "poc" },
];

interface SidebarProps {
  identityCards: ProjectResponse[];
  selectedProject: ProjectResponse | null;
  onProjectSelect: (project: ProjectResponse) => void;
}

export default function Sidebar({
  identityCards,
  selectedProject,
  onProjectSelect,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const featureAccess = useFeatureAccess();
  const { isFeatureEnabled } = usePostHogFlags();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-60 flex-col border-r bg-white shadow-sm">
      {/* Logo/Header */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <img src={"/logo-small.png"} className="w-24" />
      </div>

      {/* Project Selector */}
      <ProjectSelector
        projects={identityCards}
        selectedProject={selectedProject}
        onProjectSelect={onProjectSelect}
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
      <nav className="flex-1 overflow-y-auto py-4 px-2">

        {/* Insights Section */}
        <div className="mb-6">
          <div className="px-3 mb-2 text-xs font-semibold text-dark-500 tracking-widest uppercase">
            Insights
          </div>
          <ul className="space-y-1">
            {insightsMenuItems.map((item) => {
              const isActive = pathname === item.href;
              const hasAccess = !item.feature || featureAccess[item.feature];
              const isLocked = item.feature && !hasAccess && featureAccess.isFreePlan;
              
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                      ${
                        isActive
                          ? "bg-accent-50 text-accent-700"
                          : isLocked
                          ? "text-dark-600 hover:bg-dark-50 cursor-pointer"
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
                      <span className="ml-auto inline-block rounded bg-accent-100 px-1.5 py-0.5 text-[10px] font-medium text-accent-700">
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
              
              // Check if this is the Content KPI item and if user has access
              if (item.href === "/content-kpi" && !isFeatureEnabled('page-intelligence')) {
                return null; // Don't render the item if feature flag is disabled
              }
              
              // Check if this is the Page Magic item and if user has access
              if (item.href === "/page-magic" && !isFeatureEnabled('page-magic')) {
                return null; // Don't render the item if feature flag is disabled
              }
              
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
                      <span className="ml-auto inline-block rounded bg-accent-100 px-1.5 py-0.5 text-[10px] font-medium text-accent-700">
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
        {/* Settings Links */}
        <div className="p-4 space-y-2">
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
            <span className="flex-1">Account Settings</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
