"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Check, Mail, Crown, Building, Cpu } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { getUserProfile, updateEmail } from "@/lib/auth-api";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
  };
  selectedModels: string[];
  createdAt: string;
  updatedAt: string;
  projectIds: string[];
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
}

export default function SettingsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  // AI Models state
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isUpdatingModels, setIsUpdatingModels] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);

  // API Functions
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const fetchAvailableModels = async () => {
    const response = await fetch(
      `${API_BASE_URL}/user/profile/available-models`,
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

    return response.json();
  };

  const updateSelectedModels = async (models: string[]) => {
    const response = await fetch(
      `${API_BASE_URL}/user/profile/selected-models`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedModels: models }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update selected models");
    }

    return response.json();
  };

  // Fetch user profile and available models
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const userProfile = await getUserProfile(token);
        setProfile(userProfile as UserProfile);
        setNewEmail(userProfile.email);
        setSelectedModels(userProfile.selectedModels || []);

        // Fetch available models
        setModelsLoading(true);
        try {
          const modelsData = await fetchAvailableModels();
          setAvailableModels(modelsData.models || []);
        } catch (err) {
          console.error("Failed to fetch available models:", err);
        } finally {
          setModelsLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        setError("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  const handleEmailUpdate = async () => {
    if (!token || !profile) return;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (newEmail === profile.email) {
      setEmailError("New email must be different from current email");
      return;
    }

    setEmailError("");
    setIsUpdatingEmail(true);

    try {
      const updatedProfile = await updateEmail({ email: newEmail }, token);
      setProfile(updatedProfile as UserProfile);
      toast.success("Email updated successfully");
    } catch (err: any) {
      console.error("Failed to update email:", err);
      if (err.message === "Email already in use") {
        setEmailError("This email is already in use");
      } else {
        toast.error("Failed to update email");
      }
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleModelToggle = (modelId: string) => {
    setSelectedModels((prev) => {
      const isSelected = prev.includes(modelId);
      if (isSelected) {
        return prev.filter((id) => id !== modelId);
      } else {
        // Check if we can add more models
        if (prev.length >= (profile?.planSettings.maxAIModels || 3)) {
          toast.error(
            `You can only select up to ${profile?.planSettings.maxAIModels} models with your current plan`
          );
          return prev;
        }
        return [...prev, modelId];
      }
    });
  };

  const handleSaveModels = async () => {
    if (!token || !profile) return;

    setIsUpdatingModels(true);
    try {
      const updatedProfile = await updateSelectedModels(selectedModels);
      setProfile(updatedProfile as UserProfile);
      toast.success("AI model preferences saved successfully");
    } catch (err: any) {
      console.error("Failed to update selected models:", err);
      toast.error("Failed to save AI model preferences");
    } finally {
      setIsUpdatingModels(false);
    }
  };

  const getPlanName = () => {
    if (!profile?.stripePlanId) return "Free";
    // This would be mapped from stripePlanId in a real app
    return "Pro";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>
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
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || "Failed to load settings"}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Account Information */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => {
                        setNewEmail(e.target.value);
                        setEmailError("");
                      }}
                      placeholder="Enter new email"
                      className={emailError ? "border-destructive" : ""}
                    />
                    <Button
                      onClick={handleEmailUpdate}
                      disabled={isUpdatingEmail || newEmail === profile.email}
                    >
                      {isUpdatingEmail ? "Updating..." : "Update"}
                    </Button>
                  </div>
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plan Information */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Plan Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current Plan
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold">{getPlanName()}</p>
                      <Badge variant="secondary">
                        {profile.stripePlanId || "free"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/update-plan")}
                  >
                    Upgrade Plan
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <Label>Project Limit</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-semibold">
                        {profile.projectIds.length} /{" "}
                        {profile.planSettings.maxProjects}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        projects
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            (profile.projectIds.length /
                              profile.planSettings.maxProjects) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-muted-foreground" />
                      <Label>AI Models</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-semibold">
                        {selectedModels.length} /{" "}
                        {profile.planSettings.maxAIModels}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        selected
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            (selectedModels.length /
                              profile.planSettings.maxAIModels) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {profile.stripeCustomerId && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Stripe Customer ID: {profile.stripeCustomerId}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Models Selection */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  AI Models Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Select up to {profile.planSettings.maxAIModels} AI models
                      for batch processing
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedModels.length} of{" "}
                      {profile.planSettings.maxAIModels} models selected
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveModels}
                    disabled={
                      isUpdatingModels ||
                      JSON.stringify(selectedModels.sort()) ===
                        JSON.stringify((profile.selectedModels || []).sort())
                    }
                  >
                    {isUpdatingModels ? "Saving..." : "Save Changes"}
                  </Button>
                </div>

                {modelsLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableModels.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <Checkbox
                          id={model.id}
                          checked={selectedModels.includes(model.id)}
                          onCheckedChange={() => handleModelToggle(model.id)}
                          disabled={
                            !selectedModels.includes(model.id) &&
                            selectedModels.length >=
                              profile.planSettings.maxAIModels
                          }
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={model.id}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {model.name}
                            </Label>
                            <Badge variant="outline" className="text-xs">
                              {model.provider}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {model.provider} model for batch processing
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {availableModels.length === 0 && !modelsLoading && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No AI models are currently available. Please contact
                      support.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
