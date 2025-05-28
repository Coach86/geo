import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2 } from 'lucide-react';
import { IdentityCardResponse } from "@/lib/auth-api";

interface CompetitorsCardProps {
  company: IdentityCardResponse;
  onEdit: () => void;
}

export function CompetitorsCard({ company, onEdit }: CompetitorsCardProps) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-1 h-4 bg-purple-500 rounded-full group-hover:h-5 transition-all duration-300"></div>
            Competitors
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-100"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4 text-gray-500 hover:text-gray-700" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {company.competitors.length > 0 ? (
            company.competitors.map((competitor, index) => (
              <Badge
                key={index}
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors duration-200"
              >
                {competitor}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic">No competitors defined</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}