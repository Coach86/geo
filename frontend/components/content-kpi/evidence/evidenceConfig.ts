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
    iconColor: 'text-accent',
    textColor: 'text-gray-700',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-red-600',
    textColor: 'text-gray-700',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    textColor: 'text-gray-700',
  },
  info: {
    icon: Info,
    iconColor: 'text-gray-500',
    textColor: 'text-gray-600',
  },
} as const;