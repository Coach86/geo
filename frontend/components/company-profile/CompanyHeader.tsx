import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Globe, Languages, ChevronDown } from 'lucide-react';
import { IdentityCardResponse } from "@/lib/auth-api";

interface CompanyHeaderProps {
  company: IdentityCardResponse;
  isDescriptionExpanded: boolean;
  setIsDescriptionExpanded: (expanded: boolean) => void;
}

export function CompanyHeader({ company, isDescriptionExpanded, setIsDescriptionExpanded }: CompanyHeaderProps) {
  const getMarketEmoji = (market: string) => {
    const marketFlags: { [key: string]: string } = {
      "United States": "🇺🇸",
      "United Kingdom": "🇬🇧",
      "Canada": "🇨🇦",
      "Australia": "🇦🇺",
      "Germany": "🇩🇪",
      "France": "🇫🇷",
      "Japan": "🇯🇵",
      "China": "🇨🇳",
      "India": "🇮🇳",
      "Brazil": "🇧🇷",
      "Mexico": "🇲🇽",
      "Spain": "🇪🇸",
      "Italy": "🇮🇹",
      "Netherlands": "🇳🇱",
      "Sweden": "🇸🇪",
      "Global": "🌐",
    };
    return marketFlags[market] || "🌐";
  };

  const getLanguageEmoji = (language: string) => {
    const languageFlags: { [key: string]: string } = {
      "en": "🇬🇧",
      "es": "🇪🇸",
      "fr": "🇫🇷",
      "de": "🇩🇪",
      "it": "🇮🇹",
      "pt": "🇵🇹",
      "ja": "🇯🇵",
      "zh": "🇨🇳",
      "ko": "🇰🇷",
      "ar": "🇸🇦",
      "hi": "🇮🇳",
      "ru": "🇷🇺",
    };
    return languageFlags[language] || "🌐";
  };

  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Building2 className="h-8 w-8 text-gray-700" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">{company.brandName}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{company.industry}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-gray-200 bg-white/80 hover:bg-gray-50 transition-colors">
              <Globe className="mr-1 h-3 w-3" />
              {getMarketEmoji(company.market)} {company.market}
            </Badge>
            <Badge variant="outline" className="border-gray-200 bg-white/80 hover:bg-gray-50 transition-colors">
              <Languages className="mr-1 h-3 w-3" />
              {getLanguageEmoji(company.language || "en")} {company.language?.toUpperCase() || "EN"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="group">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-2">Website</h3>
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 group"
            >
              <span className="border-b border-transparent group-hover:border-blue-600 transition-all duration-200">
                {company.website}
              </span>
              <svg className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <div className="relative">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-2">Description</h3>
            <div className="relative pl-4">
              <div className={`absolute left-0 top-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full transition-all duration-300 ${isDescriptionExpanded ? 'h-full' : 'h-6'}`}></div>
              
              <div
                className="cursor-pointer group"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                <p className={`text-sm text-gray-700 leading-relaxed transition-all duration-300 ${!isDescriptionExpanded ? 'line-clamp-1' : ''}`}>
                  {company.longDescription || company.shortDescription}
                </p>
                
                {(company.longDescription || company.shortDescription).length > 100 && (
                  <button
                    className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDescriptionExpanded(!isDescriptionExpanded);
                    }}
                  >
                    <span>{isDescriptionExpanded ? 'Show less' : 'Show more'}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isDescriptionExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}