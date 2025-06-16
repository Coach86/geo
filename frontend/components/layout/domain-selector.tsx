"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, ArrowRightLeft } from "lucide-react";
import { ProjectResponse } from "@/lib/auth-api";
import { extractHostname } from "@/utils/url-utils";
import { Favicon } from "@/components/ui/favicon";

interface DomainSelectorProps {
  projects: ProjectResponse[];
  selectedDomain: string | null;
  onDomainSelect: (domain: string) => void;
}

// Helper to get favicon for a domain from projects
function getFaviconForDomain(domain: string, projects: ProjectResponse[]): string | undefined {
  const project = projects.find(p => extractHostname(p.url) === domain);
  return project?.favicon;
}

export default function DomainSelector({
  projects,
  selectedDomain,
  onDomainSelect,
}: DomainSelectorProps) {
  const [domains, setDomains] = useState<string[]>([]);

  useEffect(() => {
    // Extract unique domains from projects
    const uniqueDomains = Array.from(
      new Set(
        projects
          .map((project) => extractHostname(project.url))
          .filter((domain): domain is string => domain !== null)
      )
    ).sort();

    setDomains(uniqueDomains);

    // Auto-select first domain if none selected and no persisted domain
    if (!selectedDomain && uniqueDomains.length > 0) {
      // The NavigationProvider handles persisted domain, so only select first if truly no selection
      const hasPersistedDomain = uniqueDomains.includes(selectedDomain || '');
      if (!hasPersistedDomain) {
        onDomainSelect(uniqueDomains[0]);
      }
    }
  }, [projects]); // Remove dependencies that cause re-selection

  if (domains.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-4 border-b">
      <Select value={selectedDomain || ""} onValueChange={onDomainSelect}>
        <SelectTrigger className="w-full h-14 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border-0 shadow-sm [&>svg]:hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                <Favicon 
                  src={selectedDomain ? getFaviconForDomain(selectedDomain, projects) : undefined}
                  alt={`${selectedDomain} favicon`}
                  className="w-5 h-5"
                  fallbackClassName="w-5 h-5 text-gray-600"
                />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-xs text-gray-500 font-medium">Domain</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {selectedDomain || "Select domain"}
                </p>
              </div>
            </div>
            <ArrowRightLeft className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
          </div>
        </SelectTrigger>
        <SelectContent className="max-w-[250px]">
          {domains.map((domain) => (
            <SelectItem key={domain} value={domain} className="cursor-pointer">
              <div className="flex items-center gap-2 py-1">
                <Favicon 
                  src={getFaviconForDomain(domain, projects)}
                  alt={`${domain} favicon`}
                  className="w-4 h-4"
                  fallbackClassName="w-4 h-4 text-gray-500"
                />
                <span className="truncate text-sm">{domain}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}