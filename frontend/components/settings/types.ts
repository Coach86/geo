export interface AIModel {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  webAccess: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface EmailUpdateDialogProps extends SettingsDialogProps {
  currentEmail: string;
  onUpdate: (email: string) => Promise<void>;
}

export interface UserManagementDialogProps extends SettingsDialogProps {
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export interface LanguageOption {
  value: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
];