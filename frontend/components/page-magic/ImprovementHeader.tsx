'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIGS = {
  pending: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    label: 'Pending',
  },
  processing: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Loader2,
    label: 'Processing',
  },
  completed: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    label: 'Completed',
  },
  failed: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle,
    label: 'Failed',
  },
};

interface ImprovementHeaderProps {
  pageUrl: string;
  status: string;
}

export function ImprovementHeader({ pageUrl, status }: ImprovementHeaderProps) {
  const router = useRouter();
  const statusConfig = STATUS_CONFIGS[status as keyof typeof STATUS_CONFIGS];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/page-magic')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Page Improvement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new URL(pageUrl).hostname}
          </p>
        </div>
      </div>

      <Badge 
        variant="outline" 
        className={cn("flex items-center gap-1.5", statusConfig.color)}
      >
        <StatusIcon className={cn("h-3 w-3", status === 'processing' && "animate-spin")} />
        {statusConfig.label}
      </Badge>
    </div>
  );
}