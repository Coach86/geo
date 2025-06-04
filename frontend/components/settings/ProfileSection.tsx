import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { updateEmail } from "@/lib/auth-api";
import { toast } from "sonner";
import type { UserProfile } from "./types";

interface ProfileSectionProps {
  profile: UserProfile;
  token: string;
  onProfileUpdate: (profile: UserProfile) => void;
}

export function ProfileSection({ profile, token, onProfileUpdate }: ProfileSectionProps) {
  const [newEmail, setNewEmail] = useState(profile.email);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleEmailUpdate = async () => {
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
      onProfileUpdate(updatedProfile);
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

  return (
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
  );
}