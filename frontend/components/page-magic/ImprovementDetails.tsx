'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImprovementIteration } from '@/hooks/usePageImprovement';

interface ImprovementDetailsProps {
  improvement: ImprovementIteration;
}

export function ImprovementDetails({ improvement }: ImprovementDetailsProps) {
  return (
    <Card className="p-6">
      <Tabs defaultValue="issues" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="issues">Issues ({improvement.issues.length})</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations ({improvement.recommendations.length})</TabsTrigger>
          <TabsTrigger value="scores">Score Changes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="issues" className="space-y-3 mt-4">
          {improvement.issues.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No issues found</p>
          ) : (
            improvement.issues.map((issue, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{issue}</span>
              </div>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="recommendations" className="space-y-3 mt-4">
          {improvement.recommendations.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No recommendations</p>
          ) : (
            improvement.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  {rec}
                </span>
              </div>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="scores" className="mt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Before</div>
              <div className="text-2xl font-bold mt-1">{improvement.scoreBefore}</div>
            </div>
            <div className="p-4 flex items-center justify-center">
              <ArrowLeft className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">After</div>
              <div className="text-2xl font-bold mt-1">{improvement.scoreAfter}</div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <Badge 
              variant="outline"
              className={cn(
                "text-lg px-4 py-1",
                improvement.scoreAfter > improvement.scoreBefore
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-gray-100 text-gray-800 border-gray-200"
              )}
            >
              {improvement.scoreAfter > improvement.scoreBefore ? '+' : ''}
              {improvement.scoreAfter - improvement.scoreBefore} points
            </Badge>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}