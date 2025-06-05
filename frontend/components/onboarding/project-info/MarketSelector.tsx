"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Info, AlertCircle, ArrowRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { countries, languages, countryToLanguage } from "@/constants/markets-languages";
import { CountrySelector } from "./CountryLanguageSelector";
import { MarketCard } from "./MarketCard";
import type { Market, PlanType } from "./types";
import { PLAN_COLORS } from "./types";

interface MarketSelectorProps {
  markets: Market[];
  onMarketsChange: (markets: Market[]) => void;
  planImpact: PlanType;
  onShowPricingDialog: () => void;
}

export function MarketSelector({
  markets,
  onMarketsChange,
  planImpact,
  onShowPricingDialog,
}: MarketSelectorProps) {
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [selectedCountryForLanguages, setSelectedCountryForLanguages] =
    useState<string | null>(null);

  // Fonction pour ajouter un nouveau marché
  const addMarket = (country: string) => {
    // Vérifier si le marché existe déjà
    if (markets.some((market) => market.country === country)) {
      return;
    }

    // Ajouter le marché avec ses langues par défaut
    const defaultLanguages = countryToLanguage[country] || ["English"];
    const newMarkets = [...markets, { country, languages: defaultLanguages }];
    onMarketsChange(newMarkets);
    setShowCountrySelector(false);
  };

  // Fonction pour supprimer un marché
  const removeMarket = (country: string) => {
    const newMarkets = markets.filter((market) => market.country !== country);
    onMarketsChange(newMarkets);
  };

  // Fonction pour ajouter une langue à un marché
  const addLanguageToMarket = (country: string, language: string) => {
    const newMarkets = markets.map((market) => {
      if (market.country === country) {
        // Vérifier si la langue existe déjà
        if (!market.languages.includes(language)) {
          return { ...market, languages: [...market.languages, language] };
        }
      }
      return market;
    });
    onMarketsChange(newMarkets);
  };

  // Fonction pour supprimer une langue d'un marché
  const removeLanguageFromMarket = (country: string, language: string) => {
    const newMarkets = markets.map((market) => {
      if (market.country === country) {
        // Ne pas supprimer la dernière langue
        if (market.languages.length > 1) {
          return {
            ...market,
            languages: market.languages.filter((lang) => lang !== language),
          };
        }
      }
      return market;
    });
    onMarketsChange(newMarkets);
  };

  // Obtenir le label d'un pays à partir de sa valeur
  const getCountryLabel = (countryValue: string) => {
    const country = countries.find((c) => c.value === countryValue);
    return country ? country.label : countryValue;
  };

  // Obtenir le label d'une langue à partir de sa valeur
  const getLanguageLabel = (languageValue: string) => {
    const language = languages.find((l) => l.value === languageValue);
    return language ? language.label : languageValue;
  };

  const totalLanguages = markets.reduce(
    (sum, market) => sum + market.languages.length,
    0
  );

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="p-6">
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Markets & Languages
            </label>
          </div>

          {/* Affichage des marchés et langues sélectionnés */}
          <div className="space-y-3">
            {markets.map((market) => (
              <MarketCard
                key={market.country}
                market={market}
                showLanguageSelector={selectedCountryForLanguages === market.country}
                onRemoveMarket={() => removeMarket(market.country)}
                onToggleLanguageSelector={() =>
                  setSelectedCountryForLanguages(
                    selectedCountryForLanguages === market.country
                      ? null
                      : market.country
                  )
                }
                onAddLanguage={(language) => {
                  addLanguageToMarket(market.country, language);
                  setSelectedCountryForLanguages(null);
                }}
                onRemoveLanguage={(language) =>
                  removeLanguageFromMarket(market.country, language)
                }
                getCountryLabel={getCountryLabel}
                getLanguageLabel={getLanguageLabel}
              />
            ))}

            {/* Bouton pour ajouter un nouveau marché - only show if no markets yet */}
            {markets.length < 1 && (
              <Button
                variant="outline"
                className="w-full border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 mt-2"
                onClick={() => setShowCountrySelector(!showCountrySelector)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add a new market
              </Button>
            )}

            {/* Sélecteur de pays */}
            <CountrySelector
              show={showCountrySelector}
              markets={markets}
              onSelect={addMarket}
            />
          </div>

          <div className="mt-3 pl-3 border-l-4 border-l-accent-300 bg-gray-50/50 p-2 rounded-r-md flex">
            <Info className="h-4 w-4 text-accent-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-xs italic text-gray-500">
              Select the markets you want to analyze and the languages for each
              market. AI models evaluate and describe brands uniquely across
              various markets and languages. Competitors, consumer perceptions,
              and search queries can vary significantly by region and language.
            </p>
          </div>
        </div>

        {/* Alerte sur l'impact du plan */}
        {(markets.length > 1 ||
          markets.some((market) => market.languages.length > 1)) && (
          <div className="mt-4 p-4 border border-accent-200 bg-accent-50 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-accent-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-accent-700">
                Your selection requires a {planImpact} plan or higher
              </p>
              <p className="text-xs text-accent-600 mt-1">
                You've selected {markets.length}{" "}
                {markets.length === 1 ? "market" : "markets"} and{" "}
                {totalLanguages}{" "}
                {totalLanguages === 1 ? "language" : "languages"}.
              </p>
              <div className="mt-2 flex">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-2 text-xs text-accent-700 hover:text-accent-900"
                  onClick={onShowPricingDialog}
                >
                  View pricing details
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}