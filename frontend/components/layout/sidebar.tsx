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
  Settings,
  Plus,
  Lightbulb,
} from "lucide-react";
import {
  ProjectResponse,
  getUserProfile,
  createProjectFromUrl,
} from "@/lib/auth-api";
import { getMyOrganization, Organization } from "@/lib/organization-api";
import AddProjectModal from "@/components/AddProjectModal";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import DomainSelector from "./domain-selector";
import { useNavigation } from "@/providers/navigation-provider";

interface SidebarItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
}

const projectMenuItems: SidebarItem[] = [
  { label: "Profile", icon: User, href: "/profile" },
];

const insightsMenuItems: SidebarItem[] = [
  { label: "Visibility", icon: Eye, href: "/visibility" },
  { label: "Citations", icon: Quote, href: "/citations" },
  { label: "Sentiment", icon: Heart, href: "/sentiment" },
  { label: "Alignment", icon: Shield, href: "/alignment" },
  { label: "Competition", icon: Swords, href: "/battle" },
];

const optimizationMenuItems: SidebarItem[] = [
  { label: "Recommendations", icon: Lightbulb, href: "/recommendations" },
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
  const { token } = useAuth();
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const { selectedDomain, setSelectedDomain } = useNavigation();

  // Fetch organization to check plan limits
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!token) return;
      try {
        const org = await getMyOrganization(token);
        setOrganization(org);
      } catch (error) {
        console.error("Failed to fetch organization:", error);
      }
    };
    fetchOrganization();
  }, [token]);

  const handleAddProjectClick = () => {
    if (!organization) {
      setIsAddProjectModalOpen(true);
      return;
    }

    const currentProjectCount = identityCards.length;
    const maxProjects = organization.planSettings?.maxProjects || 1;

    console.log('Add project clicked:', {
      currentProjectCount,
      maxProjects,
      shouldRedirect: currentProjectCount >= maxProjects,
      planSettings: organization.planSettings
    });

    if (currentProjectCount >= maxProjects) {
      // Redirect to update plan page
      router.push("/update-plan");
    } else {
      setIsAddProjectModalOpen(true);
    }
  };

  const handleCreateProject = async (data: {
    url: string;
    market: string;
    language: string;
    name: string;
  }) => {
    if (!token) throw new Error("Not authenticated");

    const result = await createProjectFromUrl(data, token);
    return result;
  };

  const handleProjectCreated = (projectId: string) => {
    // Reload the page to refresh the project list
    window.location.reload();
  };

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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {/* Project Section */}
        <div className="mb-6">
          <div className="px-3 mb-2 text-xs font-semibold text-dark-500 tracking-widest uppercase">
            Project
          </div>
          <ul className="space-y-1">
            {projectMenuItems.map((item) => {
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
        {/* Add Project Button */}
        <div className="p-4 pb-2">
          <button
            onClick={handleAddProjectClick}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors bg-primary-50 text-primary-700 hover:bg-primary-100 w-full"
          >
            <Plus className="w-5 h-5 text-primary-600" />
            <span className="flex-1">Add Project</span>
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

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectModalOpen}
        onClose={() => setIsAddProjectModalOpen(false)}
        onSuccess={handleProjectCreated}
        onCreateProject={handleCreateProject}
      />
    </aside>
  );
}
