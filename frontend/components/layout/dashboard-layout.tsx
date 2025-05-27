"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import SaasSidebar from "./saas-sidebar";
import { getUserIdentityCards, IdentityCardResponse } from "@/lib/auth-api";
import { Loader2 } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: authLoading,
    token,
    checkAuth,
  } = useAuth();
  const [identityCards, setIdentityCards] = useState<IdentityCardResponse[]>(
    []
  );
  const [selectedCompany, setSelectedCompany] =
    useState<IdentityCardResponse | null>(null);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  useEffect(() => {
    const verifyAndLoadData = async () => {
      if (!authLoading) {
        if (!isAuthenticated) {
          const isValid = await checkAuth();
          if (!isValid) {
            router.push("/auth/login");
            return;
          }
        }

        if (token) {
          setIsLoadingCards(true);
          try {
            const cards = await getUserIdentityCards(token);
            if (
              !cards ||
              (Array.isArray(cards) && (cards as unknown[]).length === 0)
            ) {
              router.push("/onboarding");
              return null;
            }
            setIdentityCards(cards);

            // Check if there's a previously selected company in localStorage
            const savedCompanyId = localStorage.getItem("selectedCompanyId");
            const savedCompany = cards.find(
              (card) => card.id === savedCompanyId
            );

            if (savedCompany) {
              setSelectedCompany(savedCompany);
            } else if (cards.length > 0 && !selectedCompany) {
              setSelectedCompany(cards[0]);
              localStorage.setItem("selectedCompanyId", cards[0].id);
            }
          } catch (error) {
            console.error("Failed to load identity cards:", error);
          } finally {
            setIsLoadingCards(false);
          }
        }
      }
    };

    verifyAndLoadData();
  }, [authLoading, isAuthenticated, token, router, checkAuth]);

  const handleCompanySelect = (company: IdentityCardResponse) => {
    setSelectedCompany(company);
    localStorage.setItem("selectedCompanyId", company.id);

    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event("companySelectionChanged"));
  };

  if (authLoading || isLoadingCards) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <SaasSidebar
        identityCards={identityCards}
        selectedCompany={selectedCompany}
        onCompanySelect={handleCompanySelect}
      />
      <main className="flex-1 overflow-y-auto ml-60">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
