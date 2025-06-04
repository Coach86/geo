"use client";

import { Card, CardContent } from "@/components/ui/card";
import { countries, languages } from "@/constants/markets-languages";
import type { Market } from "./types";

interface CountryLanguageSelectorProps {
  show: boolean;
  markets: Market[];
  onSelect: (country: string) => void;
}

export function CountrySelector({
  show,
  markets,
  onSelect,
}: CountryLanguageSelectorProps) {
  if (!show) return null;

  return (
    <Card className="border border-gray-200 mt-2">
      <CardContent className="p-3">
        <div className="max-h-[250px] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {countries
              .filter(
                (country) =>
                  !markets.some((market) => market.country === country.value)
              )
              .map((country) => (
                <div
                  key={country.value}
                  className="flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100"
                  onClick={() => onSelect(country.value)}
                >
                  <span>{country.label}</span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface LanguageSelectorProps {
  show: boolean;
  market: Market;
  onSelect: (language: string) => void;
}

export function LanguageSelector({
  show,
  market,
  onSelect,
}: LanguageSelectorProps) {
  if (!show) return null;

  return (
    <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50 max-h-[200px] overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {languages
          .filter((language) => !market.languages.includes(language.value))
          .map((language) => (
            <div
              key={language.value}
              className="flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100"
              onClick={() => onSelect(language.value)}
            >
              <span>{language.label}</span>
            </div>
          ))}
      </div>
    </div>
  );
}