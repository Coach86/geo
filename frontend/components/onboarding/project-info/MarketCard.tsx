"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Languages, X } from "lucide-react";
import { LanguageSelector } from "./CountryLanguageSelector";
import type { Market } from "./types";

interface MarketCardProps {
  market: Market;
  showLanguageSelector: boolean;
  onRemoveMarket: () => void;
  onToggleLanguageSelector: () => void;
  onAddLanguage: (language: string) => void;
  onRemoveLanguage: (language: string) => void;
  getCountryLabel: (country: string) => string;
  getLanguageLabel: (language: string) => string;
}

export function MarketCard({
  market,
  showLanguageSelector,
  onRemoveMarket,
  onToggleLanguageSelector,
  onAddLanguage,
  onRemoveLanguage,
  getCountryLabel,
  getLanguageLabel,
}: MarketCardProps) {
  return (
    <Card className="border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 p-3 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center">
          <MapPin className="h-4 w-4 text-accent-500 mr-2" />
          <span className="font-medium">{getCountryLabel(market.country)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-gray-500 hover:text-red-500"
            onClick={onRemoveMarket}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center mb-2">
          <Languages className="h-4 w-4 text-secondary-500 mr-2" />
          <span className="text-sm font-medium">Languages</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {market.languages.map((language) => (
            <Badge
              key={language}
              className="bg-secondary-50 text-secondary-700 hover:bg-secondary-100 px-3 py-1.5 flex items-center gap-1"
            >
              {getLanguageLabel(language)}
              {market.languages.length > 1 && (
                <button
                  onClick={() => onRemoveLanguage(language)}
                  className="ml-1 hover:bg-secondary-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>

        <LanguageSelector
          show={showLanguageSelector}
          market={market}
          onSelect={(language) => {
            onAddLanguage(language);
            onToggleLanguageSelector();
          }}
        />
      </div>
    </Card>
  );
}