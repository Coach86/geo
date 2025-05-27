import { Card, CardContent } from "@/components/ui/card";
import { Calendar, RefreshCw } from 'lucide-react';
import { IdentityCardResponse } from "@/lib/auth-api";

interface CompanyMetadataProps {
  company: IdentityCardResponse;
}

export function CompanyMetadata({ company }: CompanyMetadataProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-white">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
          <div className="group cursor-default">
            <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1 group-hover:text-gray-700 transition-colors">Company ID</p>
            <p className="text-gray-700 font-mono text-xs bg-gray-100 px-2 py-1 rounded group-hover:bg-gray-200 transition-colors">{company.id}</p>
          </div>
          <div className="group cursor-default">
            <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1 group-hover:text-gray-700 transition-colors">Created</p>
            <p className="text-gray-700 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
              <span className="group-hover:text-gray-900 transition-colors">{formatDate(company.createdAt)}</span>
            </p>
          </div>
          <div className="group cursor-default">
            <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1 group-hover:text-gray-700 transition-colors">Last Updated</p>
            <p className="text-gray-700 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 text-gray-400 group-hover:text-gray-600 group-hover:rotate-180 transition-all duration-500" />
              <span className="group-hover:text-gray-900 transition-colors">{formatDate(company.updatedAt)}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}