"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getModelsConfig, ModelConfig } from "@/lib/api/config";
import { setModelConfigCache } from "@/utils/model-utils";
import { useAuth } from "./auth-provider";

interface ModelsContextValue {
  models: ModelConfig[];
  loading: boolean;
  error: string | null;
}

const ModelsContext = createContext<ModelsContextValue | null>(null);

export function ModelsProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const response = await getModelsConfig(token);
        setModels(response.models);
        
        // Set the cache for the model utils
        setModelConfigCache(response.models);
      } catch (err) {
        console.error("Failed to fetch models config:", err);
        setError(err instanceof Error ? err.message : "Failed to load models");
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [token]);

  return (
    <ModelsContext.Provider value={{ models, loading, error }}>
      {children}
    </ModelsContext.Provider>
  );
}

export function useModels() {
  const context = useContext(ModelsContext);
  if (!context) {
    throw new Error("useModels must be used within a ModelsProvider");
  }
  return context;
}