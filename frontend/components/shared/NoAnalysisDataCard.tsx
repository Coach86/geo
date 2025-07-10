import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, LucideIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface NoAnalysisDataCardProps {
  message?: string;
  icon?: LucideIcon;
  className?: string;
  title?: string;
  showHint?: boolean;
}

export function NoAnalysisDataCard({ 
  message = 'There is no analysis available in this time range. Choose another time range or select "Latest" to view the most recent data.',
  icon: Icon = Calendar,
  className = '',
  title = 'No Data Available',
  showHint = true
}: NoAnalysisDataCardProps) {
  return (
    <Card className={`max-w-md w-full ${className} border-dashed border-2`}>
      <CardContent className="pt-8 pb-8 px-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="bg-background border-2 border-primary/20 rounded-full p-4">
            <Icon className="h-8 w-8 text-primary/60" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground/90">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              {message}
            </p>
          </div>

          {showHint && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mt-2">
              <ChevronLeft className="h-3 w-3" />
              <span>Try adjusting the date range above</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}