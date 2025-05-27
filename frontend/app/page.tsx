"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/providers/auth-provider";
import {
  getCompanyById,
  getPromptSet,
  updateIdentityCard,
  IdentityCardResponse,
  PromptSet
} from "@/lib/auth-api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

// Import component modules
import { CompanyHeader } from "@/components/company-profile/CompanyHeader";
import { AttributesCard } from "@/components/company-profile/AttributesCard";
import { CompetitorsCard } from "@/components/company-profile/CompetitorsCard";
import { PromptsPortfolio } from "@/components/company-profile/PromptsPortfolio";
import { CompanyMetadata } from "@/components/company-profile/CompanyMetadata";
import { EditAttributesDialog } from "@/components/company-profile/EditAttributesDialog";
import { EditCompetitorsDialog } from "@/components/company-profile/EditCompetitorsDialog";

export default function Home() {
  const { token } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<IdentityCardResponse | null>(null);
  const [promptSet, setPromptSet] = useState<PromptSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Modal states
  const [editAttributesOpen, setEditAttributesOpen] = useState(false);
  const [editCompetitorsOpen, setEditCompetitorsOpen] = useState(false);

  // Get selected company from localStorage or dashboard context
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      const selectedCompanyId = localStorage.getItem("selectedCompanyId");

      if (!selectedCompanyId || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const companyData = await getCompanyById(selectedCompanyId, token);
        setSelectedCompany(companyData);
        setError(null);

        // Fetch prompt set
        setLoadingPrompts(true);
        try {
          const prompts = await getPromptSet(selectedCompanyId, token);
          setPromptSet(prompts);
        } catch (promptErr) {
          console.error("Failed to fetch prompt set:", promptErr);
          // Don't set error for prompt set, it's optional
          setPromptSet(null);
        } finally {
          setLoadingPrompts(false);
        }
      } catch (err) {
        console.error("Failed to fetch company details:", err);
        setError("Failed to load company details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyDetails();

    // Listen for storage changes to update when company selection changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompanyId" && e.newValue) {
        fetchCompanyDetails();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events for same-tab updates
    const handleCompanyChange = () => {
      fetchCompanyDetails();
    };

    window.addEventListener("companySelectionChanged", handleCompanyChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("companySelectionChanged", handleCompanyChange);
    };
  }, [token]);

  const handleSaveAttributes = async (attributes: string[]) => {
    if (!selectedCompany || !token) return;
    const updatedCard = await updateIdentityCard(
      selectedCompany.id,
      { keyBrandAttributes: attributes },
      token
    );
    setSelectedCompany(updatedCard);
  };

  const handleSaveCompetitors = async (competitors: string[]) => {
    if (!selectedCompany || !token) return;
    const updatedCard = await updateIdentityCard(
      selectedCompany.id,
      { competitors },
      token
    );
    setSelectedCompany(updatedCard);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Company Profile
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage your company's brand identity information
          </p>
        </div>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && !selectedCompany && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a company from the sidebar to view its profile.
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && selectedCompany && (
          <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Company Header */}
            <CompanyHeader 
              company={selectedCompany}
              isDescriptionExpanded={isDescriptionExpanded}
              setIsDescriptionExpanded={setIsDescriptionExpanded}
            />

            {/* Key Brand Attributes and Competitors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AttributesCard 
                company={selectedCompany}
                onEdit={() => setEditAttributesOpen(true)}
              />
              <CompetitorsCard 
                company={selectedCompany}
                onEdit={() => setEditCompetitorsOpen(true)}
              />
            </div>

            {/* Prompts Section */}
            {promptSet && (
              <PromptsPortfolio
                promptSet={promptSet}
                companyId={selectedCompany.id}
                token={token}
                onUpdate={setPromptSet}
              />
            )}

            {/* Loading state for prompts */}
            {loadingPrompts && (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-sm text-gray-600">Loading prompts...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Company Metadata */}
            <CompanyMetadata company={selectedCompany} />
          </div>
        )}

        {/* Edit Modals */}
        {selectedCompany && (
          <>
            <EditAttributesDialog
              open={editAttributesOpen}
              onOpenChange={setEditAttributesOpen}
              attributes={selectedCompany.keyBrandAttributes}
              brandName={selectedCompany.brandName}
              onSave={handleSaveAttributes}
            />
            
            <EditCompetitorsDialog
              open={editCompetitorsOpen}
              onOpenChange={setEditCompetitorsOpen}
              competitors={selectedCompany.competitors}
              brandName={selectedCompany.brandName}
              onSave={handleSaveCompetitors}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}