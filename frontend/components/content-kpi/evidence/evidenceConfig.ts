import { 
  CheckCircle2,
  AlertCircle, 
  AlertTriangle,
  Info,
  XCircle,
} from 'lucide-react';

export const EVIDENCE_TYPE_CONFIG = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-green-600 dark:text-green-500',
    textColor: 'text-gray-700 dark:text-gray-300',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-red-600 dark:text-red-500',
    textColor: 'text-gray-700 dark:text-gray-300',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-500',
    textColor: 'text-gray-700 dark:text-gray-300',
  },
  info: {
    icon: Info,
    iconColor: 'text-gray-500 dark:text-gray-400',
    textColor: 'text-gray-600 dark:text-gray-400',
  },
} as const;