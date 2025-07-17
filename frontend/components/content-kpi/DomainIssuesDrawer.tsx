'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  AlertCircle 
} from 'lucide-react';
import { DIMENSION_COLORS } from '@/lib/constants/colors';

interface DomainIssue {
  id: string;
  domain: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  dimension: string;
  recommendation?: string;
  ruleId?: string;
  ruleName?: string;
}

interface DomainIssuesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  issues: DomainIssue[];
  onIssueClick?: (issue: DomainIssue) => void;
}

const SEVERITY_COLORS = {
  critical: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-yellow-600',
  low: 'text-blue-600',
};

const SEVERITY_ICONS = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle,
};

export function DomainIssuesDrawer({ isOpen, onClose, issues, onIssueClick }: DomainIssuesDrawerProps) {
  // Group issues by severity
  const criticalIssues = issues.filter(issue => issue.severity === 'critical');
  const highIssues = issues.filter(issue => issue.severity === 'high');
  const mediumIssues = issues.filter(issue => issue.severity === 'medium');
  const lowIssues = issues.filter(issue => issue.severity === 'low');

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="!w-[50vw] !max-w-none min-w-0" style={{ width: '50vw', maxWidth: 'none' }}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Domain Issues Summary
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Issue counts by severity */}
          <div className="grid grid-cols-4 gap-4">
            {criticalIssues.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="px-2 py-1">
                  {criticalIssues.length} Critical
                </Badge>
              </div>
            )}
            {highIssues.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                  {highIssues.length} High
                </Badge>
              </div>
            )}
            {mediumIssues.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                  {mediumIssues.length} Medium
                </Badge>
              </div>
            )}
            {lowIssues.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {lowIssues.length} Low
                </Badge>
              </div>
            )}
          </div>

          {/* Issues list */}
          <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            {['critical', 'high', 'medium', 'low'].map(severity => {
              const severityIssues = issues.filter(issue => issue.severity === severity);
              if (severityIssues.length === 0) return null;
              
              const Icon = SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS];
              const colorClass = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS];
              
              return (
                <div key={severity} className="space-y-2">
                  {severityIssues.map((issue, idx) => (
                    <div 
                      key={issue.id || idx} 
                      className={`flex items-start gap-3 p-3 rounded-lg ${onIssueClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                      style={{ backgroundColor: '#f8f9fa' }}
                      onClick={() => onIssueClick?.(issue)}
                    >
                      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${colorClass}`} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {issue.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {issue.domain} • {issue.dimension}
                              {issue.ruleName && ` • ${issue.ruleName}`}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ color: DIMENSION_COLORS[issue.dimension as keyof typeof DIMENSION_COLORS] }}
                          >
                            {issue.dimension}
                          </Badge>
                        </div>
                        {issue.recommendation && (
                          <p className="text-sm text-muted-foreground">
                            {issue.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}