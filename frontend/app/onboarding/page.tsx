"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useOnboarding } from "@/providers/onboarding-provider";
import { useAuth } from "@/providers/auth-provider";
import { getUserProjects } from "@/lib/auth-api";
import { getStepComponent, StepId } from "./steps.config";
import { getOnboardingData } from "@/lib/onboarding-storage";

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentStep, setCurrentStepData } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const { token, isAuthenticated } = useAuth();

  // Get URL from query params if available - only run once on initial load
  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam) {
      // For now, we'll just note this - the component will handle it
      console.log("URL param provided:", urlParam);
    }
  }, []); // Empty dependency array - only run once

  // Simulate loading when changing steps
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentStep]);

  // Redirect to pricing page when reaching pricing step
  useEffect(() => {
    if (currentStep === StepId.PRICING) {
      router.push("/pricing");
    }
  }, [currentStep, router]);

  useEffect(() => {
    const checkProjectsAndRedirect = async () => {
      if (isAuthenticated && token) {
        try {
          const projects = await getUserProjects(token);
          if (projects && projects.length > 0) {
            router.replace("/"); // Redirect to dashboard or home
          }
        } catch (err) {
          // Optionally handle error
        }
      }
    };
    checkProjectsAndRedirect();
  }, [isAuthenticated, token, router]);

  // Render the current step
  const renderStep = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse w-12 h-12 rounded-full bg-gray-200"></div>
        </div>
      );
    }

    const StepComponent = getStepComponent(currentStep);
    if (!StepComponent) return null;

    // Get existing data from localStorage for initial values
    const existingData = getOnboardingData();
    
    // Prepare initial data based on the current step
    let initialData: any = {};
    
    switch (currentStep) {
      case StepId.PROJECT:
        initialData = {
          project: existingData.project,
          brand: existingData.brand,
        };
        break;
        
      case StepId.BRAND:
        initialData = {
          attributes: existingData.brand?.attributes || [],
          competitors: existingData.brand?.competitors || [],
          analyzedData: existingData.brand?.analyzedData,
        };
        break;
        
      case StepId.PROMPTS:
        initialData = {
          visibilityPrompts: existingData.prompts?.visibilityPrompts || [],
          perceptionPrompts: existingData.prompts?.perceptionPrompts || [],
          projectData: existingData.project,
          brandData: existingData.brand,
        };
        break;
        
      case StepId.CONTACT:
        initialData = {
          phoneNumber: existingData.contact?.phoneNumber || "",
          phoneCountry: existingData.contact?.phoneCountry || "US",
        };
        break;
    }

    return (
      <StepComponent 
        initialData={initialData}
        onDataReady={setCurrentStepData}
      />
    );
  };

  return <div className="w-full animate-fade-in">{renderStep()}</div>;
}