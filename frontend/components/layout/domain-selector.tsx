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

interface DomainSelectorProps {
  projects: ProjectResponse[];
  selectedDomain: string | null;
  onDomainSelect: (domain: string) => void;
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
          .map((project) => {
            if (project.url) {
              try {
                const url = new URL(project.url);
                return url.hostname;
              } catch {
                return null;
              }
            }
            return null;
          })
          .filter((domain): domain is string => domain !== null)
      )
    ).sort();

    setDomains(uniqueDomains);

    // Auto-select first domain if none selected
    if (!selectedDomain && uniqueDomains.length > 0) {
      onDomainSelect(uniqueDomains[0]);
    }
  }, [projects, selectedDomain, onDomainSelect]);

  if (domains.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-4 border-b">
      <Select value={selectedDomain || ""} onValueChange={onDomainSelect}>
        <SelectTrigger className="w-full h-14 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border-0 shadow-sm [&>svg]:hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
                <Globe className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500 font-medium">Domain</p>
                <p className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                  {selectedDomain || "Select domain"}
                </p>
              </div>
            </div>
            <ArrowRightLeft className="w-5 h-5 text-gray-400" />
          </div>
        </SelectTrigger>
        <SelectContent className="max-w-[250px]">
          {domains.map((domain) => (
            <SelectItem key={domain} value={domain} className="cursor-pointer">
              <div className="flex items-center gap-2 py-1">
                <Globe className="w-4 h-4 text-gray-500" />
                <span className="truncate text-sm">{domain}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}