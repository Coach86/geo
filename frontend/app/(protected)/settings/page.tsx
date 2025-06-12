"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, LogOut } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { getUserProfile } from "@/lib/auth-api";
import { 
  getMyOrganization, 
  getOrganizationUsers, 
  type Organization,
  type OrganizationUser
} from "@/lib/organization-api";
import { OrganizationSection } from "@/components/settings/OrganizationSection";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { PlanSection } from "@/components/settings/PlanSection";
import { ModelsSection } from "@/components/settings/ModelsSection";
import { UserManagementSection } from "@/components/settings/UserManagementSection";
import type { AIModel, UserProfile } from "@/components/settings/types";
import { useAnalytics } from "@/hooks/use-analytics";

export default function SettingsPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const analytics = useAnalytics();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // AI Models state
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const fetchAvailableModels = async () => {
    const response = await fetch(
      `${API_BASE_URL}/user/organization/models`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch available models");
    }

    const data = await response.json();
    return data;
  };

  // Fetch user profile, organization, and users
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      try {
        setLoading(true);
        
        // Fetch user profile
        const userProfile = await getUserProfile(token);
        setProfile(userProfile);

        // Fetch organization
        const org = await getMyOrganization(token);
        setOrganization(org);
        setSelectedModels(org.selectedModels || []);

        // Fetch organization users
        const users = await getOrganizationUsers(token);
        setOrganizationUsers(users);

        // Fetch available models
        setModelsLoading(true);
        try {
          const modelsData = await fetchAvailableModels();
          setSelectedModels(modelsData.selectedModels || []);
          setAvailableModels(modelsData.availableModels || []);
        } catch (err) {
          console.error("Failed to fetch models:", err);
        } finally {
          setModelsLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleLogout = () => {
    analytics.trackLogout();
    logout();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !profile || !organization) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Failed to load settings"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
      
      <div className="space-y-6">
        <OrganizationSection organization={organization} />
        
        <ProfileSection
          profile={profile}
          token={token}
          onProfileUpdate={setProfile}
        />
        
        <PlanSection
          organization={organization}
          selectedModelsCount={selectedModels.length}
        />
        
        <UserManagementSection
          organization={organization}
          organizationUsers={organizationUsers}
          currentUser={profile}
          token={token}
          onUsersUpdate={setOrganizationUsers}
          onOrganizationUpdate={setOrganization}
        />
        
        <ModelsSection
          organization={organization}
          availableModels={availableModels}
          selectedModels={selectedModels}
          onSelectedModelsChange={setSelectedModels}
          modelsLoading={modelsLoading}
          token={token}
        />
      </div>
    </div>
  );
}

// Import Card components that were missing
import { Card, CardContent, CardHeader } from "@/components/ui/card";