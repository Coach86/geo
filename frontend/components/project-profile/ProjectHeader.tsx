import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Globe, Languages, ChevronDown, Edit } from "lucide-react";
import { ProjectResponse } from "@/lib/auth-api";
import { Button } from "@/components/ui/button";
import { useFavicon } from "@/hooks/use-favicon";

interface ProjectHeaderProps {
  project: ProjectResponse;
  isDescriptionExpanded: boolean;
  setIsDescriptionExpanded: (expanded: boolean) => void;
  onEditName?: () => void;
  onEditObjectives?: () => void;
}

export function ProjectHeader({
  project,
  isDescriptionExpanded,
  setIsDescriptionExpanded,
  onEditName,
  onEditObjectives,
}: ProjectHeaderProps) {
  // Get favicon from project URL
  const { faviconUrl } = useFavicon(project.url);
  
  const getMarketEmoji = (market: string) => {
    const marketFlags: { [key: string]: string } = {
      "United States": "🇺🇸",
      "United Kingdom": "🇬🇧",
      Canada: "🇨🇦",
      Australia: "🇦🇺",
      Germany: "🇩🇪",
      France: "🇫🇷",
      Japan: "🇯🇵",
      China: "🇨🇳",
      India: "🇮🇳",
      Brazil: "🇧🇷",
      Mexico: "🇲🇽",
      Spain: "🇪🇸",
      Italy: "🇮🇹",
      Netherlands: "🇳🇱",
      Sweden: "🇸🇪",
      Global: "🌐",
    };
    return marketFlags[market] || "🌐";
  };

  const getLanguageEmoji = (language: string) => {
    const languageFlags: { [key: string]: string } = {
      en: "🇬🇧",
      es: "🇪🇸",
      fr: "🇫🇷",
      de: "🇩🇪",
      it: "🇮🇹",
      pt: "🇵🇹",
      ja: "🇯🇵",
      zh: "🇨🇳",
      ko: "🇰🇷",
      ar: "🇸🇦",
      hi: "🇮🇳",
      ru: "🇷🇺",
    };
    return languageFlags[language] || "🌐";
  };

  const getLanguageName = (language: string) => {
    const languageNames: { [key: string]: string } = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ja: "Japanese",
      zh: "Chinese",
      ko: "Korean",
      ar: "Arabic",
      hi: "Hindi",
      ru: "Russian",
    };
    return languageNames[language] || language;
  };

  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              {faviconUrl ? (
                <img 
                  src={faviconUrl}
                  alt={`${project.brandName} favicon`}
                  className="h-5 w-5"
                />
              ) : (
                <Building2 className="h-5 w-5 text-gray-700" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {project.name || project.brandName}
                </CardTitle>
                {onEditName && (
                  <Button
                    onClick={onEditName}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {project.name ? `${project.brandName} • ${project.industry}` : project.industry}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className="border-gray-200 bg-white/80 hover:bg-gray-50 transition-colors"
            >
              <Globe className="mr-1 h-3 w-3" />
              {getMarketEmoji(project.market)} {project.market}
            </Badge>
            <Badge
              variant="outline"
              className="border-gray-200 bg-white/80 hover:bg-gray-50 transition-colors"
            >
              <Languages className="mr-1 h-3 w-3" />
              {getLanguageEmoji(project.language || "en")}{" "}
              {getLanguageName(project.language || "en")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="relative">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-2">
            Description
          </h3>
          <div className="relative pl-4">
            <div
              className={`absolute left-0 top-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full transition-all duration-300 ${
                isDescriptionExpanded ? "h-full" : "h-6"
              }`}
            ></div>

            <div
              className="cursor-pointer group"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            >
              <p
                className={`text-sm text-gray-700 leading-relaxed transition-all duration-300 ${
                  !isDescriptionExpanded ? "line-clamp-1" : ""
                }`}
              >
                {project.longDescription || project.shortDescription}
              </p>

              {(project.longDescription || project.shortDescription).length >
                100 && (
                <button
                  className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDescriptionExpanded(!isDescriptionExpanded);
                  }}
                >
                  <span>
                    {isDescriptionExpanded ? "Show less" : "Show more"}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-300 ${
                      isDescriptionExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Objectives Section */}
        <div className="relative mt-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500">
              Project Objectives
            </h3>
            {onEditObjectives && (
              <Button
                onClick={onEditObjectives}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="relative pl-4">
            <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {project.objectives || (
                <span className="text-gray-400 italic">No project objectives defined yet. Click edit to add tracking objectives.</span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
