"use client";

interface BrandBattleSectionProps {
  data: {
    competitorAnalyses: {
      competitor: string;
      analysisByModel: {
        model: string;
        strengths: string[];
        weaknesses: string[];
      }[];
    }[];
    commonStrengths: string[];
    commonWeaknesses: string[];
  };
}

export default function BrandBattleSection({ data }: BrandBattleSectionProps) {
  // Get the competitors and their analysis data
  const competitors = data.competitorAnalyses;

  // Get unique list of models across all competitor analyses
  const models = Array.from(
    new Set(
      competitors.flatMap((comp) => comp.analysisByModel.map((c) => c.model))
    )
  );

  // count the number of strengths and weaknesses across all competitors
  const strengths = competitors.flatMap((comp) =>
    comp.analysisByModel.flatMap((c) => c.strengths)
  );
  const weaknesses = competitors.flatMap((comp) =>
    comp.analysisByModel.flatMap((c) => c.weaknesses)
  );
  const totalStrengthsAndWeaknesses = strengths.length + weaknesses.length;

  return (
    <div className="mb-16 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-900">
          Brand Battle vs Pre‑selected Competitors
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          "Can you tell me the strengths and weaknesses of brand.com vs.
          competitor?"
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {competitors.map((competitor, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-base font-bold text-gray-800">
                  Brand vs{" "}
                  <span className="text-[#805AD5]">
                    {competitor.competitor}
                  </span>
                </h3>
              </div>

              <div className="p-3">
                <div>
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 border-b-2 border-gray-200 w-[40px]"></th>
                        {models.map((model, mIndex) => {
                          return (
                            <th
                              key={mIndex}
                              className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-200"
                            >
                              {model}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Strengths row */}
                      <tr className="bg-[#E3F2FD]">
                        <td className="px-2 py-2 border-b border-gray-200 font-bold text-[#0D47A1] text-sm text-center">
                          <div
                            className="flex items-center justify-center"
                            title="Strengths"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </td>
                        {models.map((model, mIndex) => {
                          const analysis = competitor.analysisByModel.find(
                            (a) => a.model === model
                          );
                          return (
                            <td
                              key={mIndex}
                              className="px-2 py-2 border-b border-gray-200 text-xs"
                            >
                              {analysis?.strengths.map((strength, sIndex) => (
                                <div
                                  key={sIndex}
                                  className="mb-1 flex items-start"
                                >
                                  <span className="text-[#2196F3] mr-1 mt-0.5 flex-shrink-0">
                                    •
                                  </span>
                                  <span className="text-gray-800">
                                    {strength}
                                  </span>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Weaknesses row */}
                      <tr className="bg-[#FCE4EC]">
                        <td className="px-2 py-2 font-bold text-[#AD1457] text-sm text-center">
                          <div
                            className="flex items-center justify-center"
                            title="Weaknesses"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </td>
                        {models.map((model, mIndex) => {
                          const analysis = competitor.analysisByModel.find(
                            (a) => a.model === model
                          );
                          return (
                            <td key={mIndex} className="px-2 py-2 text-xs">
                              {analysis?.weaknesses.map((weakness, wIndex) => (
                                <div
                                  key={wIndex}
                                  className="mb-1 flex items-start"
                                >
                                  <span className="text-[#C2185B] mr-1 mt-0.5 flex-shrink-0">
                                    •
                                  </span>
                                  <span className="text-gray-800">
                                    {weakness}
                                  </span>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Common strengths and weaknesses section */}
        {(data.commonStrengths.length > 0 ||
          data.commonWeaknesses.length > 0) && (
          <div className="mt-8 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-800">
                Common Patterns Across Competitors
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.commonStrengths.length > 0 && (
                <div className="bg-[#E3F2FD] p-3 rounded-lg">
                  <h4 className="font-semibold text-[#0D47A1] mb-2">
                    Common Strengths
                  </h4>
                  <ul className="space-y-1">
                    {data.commonStrengths.map((strength, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-[#2196F3] mr-1 mt-0.5 flex-shrink-0">
                          •
                        </span>
                        <span className="text-gray-800">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.commonWeaknesses.length > 0 && (
                <div className="bg-[#FCE4EC] p-3 rounded-lg">
                  <h4 className="font-semibold text-[#AD1457] mb-2">
                    Common Weaknesses
                  </h4>
                  <ul className="space-y-1">
                    {data.commonWeaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-[#C2185B] mr-1 mt-0.5 flex-shrink-0">
                          •
                        </span>
                        <span className="text-gray-800">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Definition and methodology section */}
        <div className="border-t border-gray-100 pt-6 mt-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            What is Brand Battle Analysis?
          </h4>
          <p className="text-gray-600 mb-4">
            Brand Battle analysis compares your brand directly against specific
            competitors to identify perceived strengths and weaknesses across
            different AI models. This helps you understand your competitive
            positioning and messaging opportunities.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-start">
              <a href="/glossary" className="flex-shrink-0 mt-0.5">
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
              </a>
              <div className="ml-3">
                <h5 className="text-sm font-medium text-blue-800">
                  Methodology
                </h5>
                <ul className="mt-1 text-sm text-blue-700 list-disc pl-5 space-y-1">
                  <li>Competitors analyzed = {competitors.length}</li>
                  <li>Models tested = {models.length}</li>
                  <li>Direct comparison prompts used: 1</li>
                  <li>
                    Strengths and weaknesses extracted from responses:{" "}
                    {totalStrengthsAndWeaknesses}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
