"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, Mail, Crown, Building } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { getUserProfile, updateEmail } from "@/lib/auth-api";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface UserProfile {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  planSettings: {
    maxBrands: number;
    maxAIModels: number;
  };
  createdAt: string;
  updatedAt: string;
  companyIds: string[];
}

export default function SettingsPage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const userProfile = await getUserProfile(token);
        setProfile(userProfile as UserProfile);
        setNewEmail(userProfile.email);
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
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
          </motion.div>

          {/* Plan Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
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
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold">{getPlanName()}</p>
                      <Badge variant="secondary">{profile.stripePlanId || "free"}</Badge>
                    </div>
                  </div>
                  <Button variant="outline">Upgrade Plan</Button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <Label>Brand Limit</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-semibold">
                        {profile.companyIds.length} / {profile.planSettings.maxBrands}
                      </p>
                      <span className="text-sm text-muted-foreground">brands</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(profile.companyIds.length / profile.planSettings.maxBrands) * 100}%`,
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
                        {profile.planSettings.maxAIModels}
                      </p>
                      <span className="text-sm text-muted-foreground">models</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximum AI models available
                    </p>
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
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}