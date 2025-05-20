"use client";

import Link from "next/link";

interface ToneSectionProps {
  globalAverage: string;
  data: {
    sentiments: {
      model: string;
      sentiment: string;
      status: string;
      positiveKeywords: string[];
      negativeKeywords: string[];
    }[];
    questions?: {
      question: string;
      results: {
        model: string;
        sentiment: string;
        status: string;
        positiveKeywords: string[];
        negativeKeywords: string[];
      }[];
    }[];
  };
}

export default function ToneSection({ data, globalAverage }: ToneSectionProps) {
  if (!data || !data.questions) return null;

  // Obtenir la liste unique des modèles (sans la moyenne globale)
  const models = Array.from(new Set(data.sentiments.map((s) => s.model)));

  // Calculer le score de sentiment global (% de sentiments positifs)
  const allResults = data.questions?.flatMap((q) => q.results);
  const positiveResults = allResults.filter((r) => r.status === "green").length;
  const sentimentScore = Math.round(
    (positiveResults / allResults.length) * 100
  );

  // Fonction pour obtenir la couleur de la cellule en fonction du statut - Style professionnel
  const getCellColor = (status: string) => {
    switch (status) {
      case "green":
        return {
          bg: "#E3F2FD",
          text: "#0D47A1",
          border: "#90CAF9",
        };
      case "yellow":
        return {
          bg: "#EDE7F6",
          text: "#4527A0",
          border: "#B39DDB",
        };
      case "red":
        return {
          bg: "#FCE4EC",
          text: "#AD1457",
          border: "#F48FB1",
        };
      default:
        return {
          bg: "#F5F5F5",
          text: "#616161",
          border: "#E0E0E0",
        };
    }
  };

  // Fonction pour obtenir la valeur numérique du sentiment
  const getSentimentValue = (sentiment: string) => {
    return Number.parseFloat(sentiment);
  };

  // Fonction pour obtenir la position relative sur une échelle de -1 à +1
  const getSentimentPosition = (sentiment: string) => {
    const value = getSentimentValue(sentiment);
    // Convertir de -1...+1 à 0...100%
    return ((value + 1) / 2) * 100 - 1;
  };

  // Fonction pour convertir le sentiment en pourcentage
  const getSentimentPercentage = (sentiment: string) => {
    return Math.round(getSentimentValue(sentiment) * 100);
  };

  // Fonction pour extraire la valeur numérique du KPI
  const getNumericValue = (value: string) => {
    return Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  };

  const tonePercentage = getNumericValue(globalAverage);

  return (
    <div className="mb-16 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-900">
          Tone — Brand Perception
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Overview of models' sentiment polarity extracted from prompted
          responses
        </p>
      </div>

      <div className="p-6">
        {/* 1. Score global en haut en gros */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
            <div>
              <div className="flex items-center mb-1">
                <h3 className="text-3xl font-bold text-gray-900">
                  {tonePercentage}%
                </h3>
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Global Average
                </span>
              </div>
              <p className="text-sm text-gray-600">positive sentiment</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                Questions Tested
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.questions.length}
              </div>
            </div>
          </div>
        </div>

        {/* Résumé statistique */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#E3F2FD] rounded-lg border border-[#90CAF9] overflow-hidden">
            <div className="px-4 py-3 bg-[#90CAF9] border-b border-[#42A5F5]">
              <h4 className="font-semibold text-[#0D47A1]">
                Positive Sentiment
              </h4>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-[#0D47A1]">
                {positiveResults}{" "}
                <span className="text-sm font-normal">responses</span>
              </div>
              <div className="text-sm text-[#1976D2] mt-1">
                {Math.round((positiveResults / allResults.length) * 100)}% of
                total
              </div>
              <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2196F3] rounded-full"
                  style={{
                    width: `${Math.round(
                      (positiveResults / allResults.length) * 100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-[#EDE7F6] rounded-lg border border-[#B39DDB] overflow-hidden">
            <div className="px-4 py-3 bg-[#B39DDB] border-b border-[#9575CD]">
              <h4 className="font-semibold text-[#4527A0]">
                Neutral Sentiment
              </h4>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-[#4527A0]">
                {allResults.filter((r) => r.status === "yellow").length}{" "}
                <span className="text-sm font-normal">responses</span>
              </div>
              <div className="text-sm text-[#673AB7] mt-1">
                {Math.round(
                  (allResults.filter((r) => r.status === "yellow").length /
                    allResults.length) *
                    100
                )}
                % of total
              </div>
              <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#673AB7] rounded-full"
                  style={{
                    width: `${Math.round(
                      (allResults.filter((r) => r.status === "yellow").length /
                        allResults.length) *
                        100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-[#FCE4EC] rounded-lg border border-[#F48FB1] overflow-hidden">
            <div className="px-4 py-3 bg-[#F48FB1] border-b border-[#EC407A]">
              <h4 className="font-semibold text-[#AD1457]">
                Negative Sentiment
              </h4>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-[#AD1457]">
                {allResults.filter((r) => r.status === "red").length}{" "}
                <span className="text-sm font-normal">responses</span>
              </div>
              <div className="text-sm text-[#C2185B] mt-1">
                {Math.round(
                  (allResults.filter((r) => r.status === "red").length /
                    allResults.length) *
                    100
                )}
                % of total
              </div>
              <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C2185B] rounded-full"
                  style={{
                    width: `${Math.round(
                      (allResults.filter((r) => r.status === "red").length /
                        allResults.length) *
                        100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Détails des résultats au milieu */}
        <div className="mb-10">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Sentiment Heatmap
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200 w-1/3">
                    Prompts
                  </th>
                  {models.map((model, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200"
                    >
                      {model}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.questions.map((q, qIndex) => (
                  <tr key={qIndex}>
                    <td className="px-4 py-3 border-b border-gray-200 font-medium">
                      {q.question.split("\n").map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </td>
                    {models.map((model, mIndex) => {
                      const result = q.results.find((r) => r.model === model);
                      const colors = result
                        ? getCellColor(result.status)
                        : getCellColor("default");
                      const sentimentLabel =
                        result?.status === "green"
                          ? "Positive"
                          : result?.status === "yellow"
                          ? "Neutral"
                          : result?.status === "red"
                          ? "Negative"
                          : "N/A";

                      return (
                        <td
                          key={mIndex}
                          className="px-4 py-3 border-b border-gray-200 text-center"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderLeft: `1px solid ${colors.border}`,
                            borderRight: `1px solid ${colors.border}`,
                          }}
                        >
                          <div className="font-medium">{sentimentLabel}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analyse par modèle */}
        <div className="mb-10">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Analysis per model
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {models.map((model, index) => {
              const modelData = data.sentiments.find((s) => s.model === model);
              if (!modelData) return null;
              const sentimentPosition = getSentimentPosition(
                modelData.sentiment
              );
              const sentimentPercentage = getSentimentPercentage(
                modelData.sentiment
              );
              const colors = modelData
                ? getCellColor(modelData.status)
                : getCellColor("default");

              return (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                >
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-gray-800">{model}</h4>
                      <div
                        className="px-2 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                      >
                        {sentimentPercentage}%
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Sentiment gauge - Style professionnel */}
                    <div className="mb-4">
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                        <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-[#C2185B] via-[#673AB7] to-[#2196F3]"></div>
                        <div
                          className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full bg-black border-2 border-white"
                          style={{ left: `${sentimentPosition}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-[#0D47A1] mb-1">
                          Main positive keywords:
                        </div>
                        <div className="bg-[#E3F2FD] p-3 rounded border border-[#90CAF9]">
                          {modelData?.positiveKeywords ? (
                            <ul className="list-disc pl-5 text-sm">
                              {modelData.positiveKeywords.map((item, i) => (
                                <li key={i} className="mb-1">
                                  {item.trim()}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm italic">
                              No positive keywords found
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-[#AD1457] mb-1">
                          Main negative keywords:
                        </div>
                        <div className="bg-[#FCE4EC] p-3 rounded border border-[#F48FB1]">
                          {modelData?.negativeKeywords ? (
                            <ul className="list-disc pl-5 text-sm">
                              {modelData.negativeKeywords.map((item, i) => (
                                <li key={i} className="mb-1">
                                  {item.trim()}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm italic">
                              No negative keywords found
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Bloc définition et méthodologie en bas */}
        <div className="border-t border-gray-100 pt-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            What is Tone Score?
          </h4>
          <p className="text-gray-600 mb-4">
            Tone score (%) = Total positive generated responses / total
            sentiment requests prompted (3 unique questions, 3 run, 5 models =
            45)
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-start">
              <Link href="/glossary" className="flex-shrink-0 mt-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="h-5 w-5 text-blue-500 hover:text-blue-700 transition-colors"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </Link>
              <div className="ml-3">
                <h5 className="text-sm font-medium text-blue-800">
                  Methodology
                </h5>
                <ul className="mt-1 text-sm text-blue-700 list-disc pl-5 space-y-1">
                  <li>Unique questions tested = 3</li>
                  <li>Sequences run = 3</li>
                  <li>Total "Tone" responses generated by model = 9</li>
                  <li>45 responses across all models tested</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
