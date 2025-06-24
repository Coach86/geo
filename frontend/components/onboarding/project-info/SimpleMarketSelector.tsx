"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Check, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { countries, languages, countryToLanguage } from "@/constants/markets-languages";
import type { Market } from "./types";

interface SimpleMarketSelectorProps {
  markets: Market[];
  onMarketsChange: (markets: Market[]) => void;
}

export function SimpleMarketSelector({
  markets,
  onMarketsChange,
}: SimpleMarketSelectorProps) {
  const [countryOpen, setCountryOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");

  // Get the current market (we only support one market in the simplified version)
  const currentMarket = markets[0];

  const handleCountrySelect = (countryValue: string) => {
    setSelectedCountry(countryValue);
    
    // Get default language for the country
    const defaultLanguages = countryToLanguage[countryValue] || ["English"];
    const defaultLanguage = defaultLanguages[0];
    
    // Update markets with new country and default language
    const newMarket: Market = {
      country: countryValue,
      languages: [defaultLanguage]
    };
    
    onMarketsChange([newMarket]);
    setSelectedLanguage(defaultLanguage);
    setCountryOpen(false);
  };

  const handleLanguageSelect = (languageValue: string) => {
    if (!currentMarket) return;
    
    setSelectedLanguage(languageValue);
    
    // Update the current market's language
    const updatedMarket: Market = {
      ...currentMarket,
      languages: [languageValue]
    };
    
    onMarketsChange([updatedMarket]);
    setLanguageOpen(false);
  };

  // Get display values
  const getCountryLabel = (countryValue: string) => {
    const country = countries.find((c) => c.value === countryValue);
    return country ? country.label : countryValue;
  };

  const getLanguageLabel = (languageValue: string) => {
    const language = languages.find((l) => l.value === languageValue);
    return language ? language.label : languageValue;
  };

  // Set initial values from current market
  useEffect(() => {
    if (currentMarket && !selectedCountry) {
      setSelectedCountry(currentMarket.country);
      setSelectedLanguage(currentMarket.languages[0]);
    }
  }, [currentMarket, selectedCountry]);

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="p-6">
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Primary Market & Language
            </label>
          </div>

          {/* Two dropdowns on the same line */}
          <div className="grid grid-cols-2 gap-4">
            {/* Country Dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Country
              </label>
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryOpen}
                    className="w-full justify-between"
                  >
                    {selectedCountry
                      ? getCountryLabel(selectedCountry)
                      : "Select country..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search countries..." />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {countries.map((country) => (
                          <CommandItem
                            key={country.value}
                            value={country.value}
                            onSelect={handleCountrySelect}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedCountry === country.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            />
                            {country.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Language Dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Language
              </label>
              <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={languageOpen}
                    className="w-full justify-between"
                    disabled={!selectedCountry}
                  >
                    {selectedLanguage
                      ? getLanguageLabel(selectedLanguage)
                      : "Select language..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search languages..." />
                    <CommandList>
                      <CommandEmpty>No language found.</CommandEmpty>
                      <CommandGroup>
                        {languages.map((language) => (
                          <CommandItem
                            key={language.value}
                            value={language.value}
                            onSelect={handleLanguageSelect}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedLanguage === language.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            />
                            {language.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Show selected market */}
          {currentMarket && (
            <div className="mt-4">
              <Badge variant="secondary" className="mr-2">
                {getCountryLabel(currentMarket.country)} - {getLanguageLabel(currentMarket.languages[0])}
              </Badge>
            </div>
          )}

          {/* Info message */}
          <div className="mt-3 pl-3 border-l-4 border-l-accent-300 bg-gray-50/50 p-2 rounded-r-md flex">
            <Info className="h-4 w-4 text-accent-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-xs italic text-gray-500">
              Competitors, consumer perceptions, and prompt language can vary significantly across markets
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}