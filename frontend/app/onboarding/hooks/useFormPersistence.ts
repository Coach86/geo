"use client";

import { useState, useEffect, useCallback } from "react";
import { createDefaultFormData } from "../types/form-data";
import type { OnboardingFormData, OnboardingConfig } from "../types/form-data";

export interface UseFormPersistenceReturn {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  savedConfigs: OnboardingConfig[];
  saveCurrentConfig: () => void;
  loadConfig: (configId: string) => boolean;
  deleteConfig: (configId: string) => void;
  createNewConfig: () => void;
  setEditingMode: (isEditing: boolean, configId?: string) => void;
}

const STORAGE_KEYS = {
  formData: "onboarding-form-data",
  savedConfigs: "onboarding-saved-configs",
  version: "onboarding-version",
};

const CURRENT_VERSION = "v3.0-refactored";

export function useFormPersistence(): UseFormPersistenceReturn {
  const [formData, setFormData] = useState<OnboardingFormData>(createDefaultFormData);
  const [savedConfigs, setSavedConfigs] = useState<OnboardingConfig[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      // Check version and clear old data if needed
      const savedVersion = localStorage.getItem(STORAGE_KEYS.version);
      if (savedVersion !== CURRENT_VERSION) {
        localStorage.removeItem(STORAGE_KEYS.formData);
        localStorage.removeItem(STORAGE_KEYS.savedConfigs);
        localStorage.setItem(STORAGE_KEYS.version, CURRENT_VERSION);
        console.log("Cleared old onboarding data due to version update");
        return;
      }

      // Load form data
      const savedFormData = localStorage.getItem(STORAGE_KEYS.formData);
      if (savedFormData) {
        const parsedData = JSON.parse(savedFormData);
        setFormData(parsedData);
      }

      // Load saved configs
      const savedConfigsData = localStorage.getItem(STORAGE_KEYS.savedConfigs);
      if (savedConfigsData) {
        const parsedConfigs = JSON.parse(savedConfigsData);
        setSavedConfigs(parsedConfigs);
      }
    } catch (error) {
      console.error("Error loading onboarding data from localStorage:", error);
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.formData, JSON.stringify(formData));
    } catch (error) {
      console.error("Error saving form data to localStorage:", error);
    }
  }, [formData]);

  // Save configs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.savedConfigs, JSON.stringify(savedConfigs));
    } catch (error) {
      console.error("Error saving configs to localStorage:", error);
    }
  }, [savedConfigs]);

  const updateFormData = useCallback((data: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
      project: { ...prev.project, ...data.project },
      brand: { ...prev.brand, ...data.brand },
      prompts: { ...prev.prompts, ...data.prompts },
      contact: { ...prev.contact, ...data.contact },
    }));
  }, []);

  const saveCurrentConfig = useCallback(() => {
    if (!formData.project.website) {
      console.warn("Cannot save config without website");
      return;
    }

    const now = new Date();
    const configId = formData.project.id;

    // Check if config already exists
    const existingIndex = savedConfigs.findIndex(config => config.id === configId);

    const config: OnboardingConfig = {
      id: configId,
      data: formData,
      createdAt: existingIndex >= 0 ? savedConfigs[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      // Update existing config
      setSavedConfigs(prev => {
        const updated = [...prev];
        updated[existingIndex] = config;
        return updated;
      });
    } else {
      // Add new config
      setSavedConfigs(prev => [...prev, config]);
    }
  }, [formData, savedConfigs]);

  const loadConfig = useCallback((configId: string): boolean => {
    const config = savedConfigs.find(c => c.id === configId);
    if (!config) {
      return false;
    }

    setFormData(config.data);
    return true;
  }, [savedConfigs]);

  const deleteConfig = useCallback((configId: string) => {
    setSavedConfigs(prev => prev.filter(config => config.id !== configId));
  }, []);

  const createNewConfig = useCallback(() => {
    // Save current config if it has content
    if (formData.project.website && !formData.isEditing) {
      saveCurrentConfig();
    }

    // Create new form data
    setFormData(createDefaultFormData());
  }, [formData, saveCurrentConfig]);

  const setEditingMode = useCallback((isEditing: boolean, configId?: string) => {
    if (isEditing && configId) {
      // Load config for editing
      const success = loadConfig(configId);
      if (success) {
        updateFormData({ isEditing: true });
      }
    } else {
      // Just update editing mode
      updateFormData({ isEditing });
    }
  }, [loadConfig, updateFormData]);

  return {
    formData,
    setFormData,
    updateFormData,
    savedConfigs,
    saveCurrentConfig,
    loadConfig,
    deleteConfig,
    createNewConfig,
    setEditingMode,
  };
}