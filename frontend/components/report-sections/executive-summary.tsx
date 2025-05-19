"use client";

import { InfoIcon } from "lucide-react";

interface ExecutiveSummaryProps {
  kpi: {
    pulse: {
      value: string;
      description: string;
    };
    tone: {
      value: string;
      status: string;
      description: string;
    };
    accord: {
      value: string;
      status: string;
      description: string;
    };
    arena: {
      competitors: string[];
      description: string;
    };
  };
}

export default function ExecutiveSummary({ kpi }: ExecutiveSummaryProps) {
  // Remplacer la palette de couleurs
  const colors = {
    pulse: {
      primary: "#1976D2",
      secondary: "#64B5F6",
      bg: "#E3F2FD",
      border: "#1976D2",
    },
    tone: {
      primary:
        kpi.tone.status === "green"
          ? "#0D47A1"
          : kpi.tone.status === "yellow"
          ? "#4527A0"
          : "#AD1457",
      secondary:
        kpi.tone.status === "green"
          ? "#2196F3"
          : kpi.tone.status === "yellow"
          ? "#673AB7"
          : "#C2185B",
      bg:
        kpi.tone.status === "green"
          ? "#E3F2FD"
          : kpi.tone.status === "yellow"
          ? "#EDE7F6"
          : "#FCE4EC",
      border:
        kpi.tone.status === "green"
          ? "#90CAF9"
          : kpi.tone.status === "yellow"
          ? "#B39DDB"
          : "#F48FB1",
    },
    accord: {
      primary:
        kpi.accord.status === "green"
          ? "#0D47A1"
          : kpi.accord.status === "yellow"
          ? "#4527A0"
          : "#AD1457",
      secondary:
        kpi.accord.status === "green"
          ? "#2196F3"
          : kpi.tone.status === "yellow"
          ? "#673AB7"
          : "#C2185B",
      bg:
        kpi.accord.status === "green"
          ? "#E3F2FD"
          : kpi.tone.status === "yellow"
          ? "#EDE7F6"
          : "#FCE4EC",
      border:
        kpi.accord.status === "green"
          ? "#90CAF9"
          : kpi.tone.status === "yellow"
          ? "#B39DDB"
          : "#F48FB1",
    },
    arena: {
      primary: "#00796B",
      secondary: "#4DB6AC",
      bg: "#E0F2F1",
      border: "#80CBC4",
    },
  };

  // Fonction pour extraire la valeur numérique du KPI
  const getNumericValue = (value: string) => {
    return Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  };

  // Calculer les pourcentages pour les barres de progression
  const pulsePercentage = getNumericValue(kpi.pulse.value);

  // Convertir la valeur du tone de -1.0 à +1.0 en pourcentage de 0 à 100%
  // Si la valeur contient un +, on considère qu'elle est positive
  const toneValue = kpi.tone.value.includes("+")
    ? getNumericValue(kpi.tone.value)
    : kpi.tone.value.includes("-")
    ? -getNumericValue(kpi.tone.value)
    : 0;

  // Convertir de l'échelle -1 à +1 à l'échelle 0 à 100%
  const tonePercentage = Math.round((toneValue + 1) * 50);

  const accordPercentage = getNumericValue(kpi.accord.value) * 10; // Supposant que c'est sur 10

  return (
    <div className="mb-16 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pulse Tile - Style professionnel */}
          <div className="relative bg-white border rounded-lg shadow-sm p-5 overflow-hidden">
            {/* Bande colorée en haut */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3182CE] to-[#63B3ED]"></div>

            <div className="flex items-center justify-between mb-4 mt-2">
              <div className="flex items-center">
                <span className="text-sm font-bold text-gray-800">Pulse</span>
                <a href="/glossary" className="ml-1.5">
                  <InfoIcon className="h-4 w-4 text-gray-400 hover:text-primary transition-colors" />
                </a>
              </div>
            </div>

            <div className="flex items-baseline mb-3">
              <div className="text-3xl font-bold text-gray-900">
                {kpi.pulse.value}
              </div>
              <div className="ml-2 text-sm text-gray-500">visibility score</div>
            </div>

            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3182CE] to-[#63B3ED]"
                style={{ width: `${pulsePercentage}%` }}
              ></div>
              <div
                className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full bg-black border-2 border-white"
                style={{ left: `${pulsePercentage}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>100%</span>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Brand organic visibility across all tested models
              </p>
            </div>
          </div>

          {/* Tone Tile - Style professionnel */}
          <div className="relative bg-white border rounded-lg shadow-sm p-5 overflow-hidden">
            {/* Bande colorée en haut */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: `linear-gradient(to right, ${colors.tone.primary}, ${colors.tone.secondary})`,
              }}
            ></div>

            <div className="flex items-center justify-between mb-4 mt-2">
              <div className="flex items-center">
                <span className="text-sm font-bold text-gray-800">Tone</span>
                <a href="/glossary" className="ml-1.5">
                  <InfoIcon className="h-4 w-4 text-gray-400 hover:text-primary transition-colors" />
                </a>
              </div>
            </div>

            <div className="flex items-baseline mb-3">
              <div
                className="text-3xl font-bold"
                style={{ color: colors.tone.primary }}
              >
                {tonePercentage}%
              </div>
              <div className="ml-2 text-sm text-gray-500">sentiment score</div>
            </div>

            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${tonePercentage}%`,
                  background: `linear-gradient(to right, ${colors.tone.primary}, ${colors.tone.secondary})`,
                }}
              ></div>
              <div
                className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full bg-black border-2 border-white"
                style={{ left: `${tonePercentage}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Overall sentiment across all tested models
              </p>
            </div>
          </div>

          {/* Accord Tile - Style professionnel */}
          <div className="relative bg-white border rounded-lg shadow-sm p-5 overflow-hidden">
            {/* Bande colorée en haut */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: `linear-gradient(to right, ${colors.accord.primary}, ${colors.accord.secondary})`,
              }}
            ></div>

            <div className="flex items-center justify-between mb-4 mt-2">
              <div className="flex items-center">
                <span className="text-sm font-bold text-gray-800">
                  Brand Compliance score
                </span>
                <a href="/glossary" className="ml-1.5">
                  <InfoIcon className="h-4 w-4 text-gray-400 hover:text-primary transition-colors" />
                </a>
              </div>
            </div>

            <div className="flex items-baseline mb-3">
              <div
                className="text-3xl font-bold"
                style={{ color: colors.accord.primary }}
              >
                {kpi.accord.value}
              </div>
              <div className="ml-2 text-sm text-gray-500">compliance score</div>
            </div>

            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${accordPercentage}%`,
                  background: `linear-gradient(to right, ${colors.accord.primary}, ${colors.accord.secondary})`,
                }}
              ></div>
              <div
                className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full bg-black border-2 border-white"
                style={{ left: `${accordPercentage}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Tested models' alignement with expected brand attributes
              </p>
            </div>
          </div>

          {/* Arena Tile - Style professionnel */}
          <div className="relative bg-white border rounded-lg shadow-sm p-5 overflow-hidden">
            {/* Bande colorée en haut */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#805AD5] to-[#B794F4]"></div>

            <div className="flex items-center justify-between mb-4 mt-2">
              <div className="flex items-center">
                <span className="text-sm font-bold text-gray-800">
                  Competition Arena
                </span>
                <a href="/glossary" className="ml-1.5">
                  <InfoIcon className="h-4 w-4 text-gray-400 hover:text-primary transition-colors" />
                </a>
              </div>
            </div>

            <div className="space-y-2 mb-2">
              {kpi.arena.competitors.slice(0, 3).map((competitor, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-[#805AD5] text-white text-xs font-bold mr-2">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{competitor}</span>
                  </div>
                  <span className="text-sm font-bold text-[#805AD5]">
                    {56 - index * 5}%
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Global organic visibility assessment within your market
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
