'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { IssuesByDimension } from './IssuesByDimension';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

interface PageIssue {
  id?: string;
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation?: string;
  affectedElements?: string[];
  ruleId?: string;
  ruleName?: string;
}

interface IssuesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  issues: PageIssue[];
  pageUrl: string;
  onIssueClick?: (issue: PageIssue) => void;
}

export function IssuesDrawer({ 
  isOpen, 
  onClose, 
  issues, 
  pageUrl, 
  onIssueClick 
}: IssuesDrawerProps) {
  const issueCount = issues.length;
  const pageTitle = (() => {
    try {
      const urlObj = new URL(pageUrl);
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch {
      return pageUrl;
    }
  })();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="!w-[50vw] !max-w-none min-w-0" style={{ width: '50vw', maxWidth: 'none' }}>
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div>
              <SheetTitle>Issues by Category</SheetTitle>
              <SheetDescription>
                {issueCount} issue{issueCount !== 1 ? 's' : ''} found on {pageTitle}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <div className="overflow-y-auto h-[calc(100vh-120px)]">
          <IssuesByDimension issues={issues} onIssueClick={onIssueClick} />
        </div>
      </SheetContent>
    </Sheet>
  );
}