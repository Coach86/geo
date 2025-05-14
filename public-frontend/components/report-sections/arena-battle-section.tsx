"use client"

interface ArenaBattleSectionProps {
  data: {
    competitors: {
      name: string
      comparisons: {
        model: string
        positives: string[]
        negatives: string[]
      }[]
    }[]
  }
}

export default function ArenaBattleSection({ data }: ArenaBattleSectionProps) {
  // Si nous n'avons pas les données au format attendu, créer des données de démonstration
  const competitors = data.competitors || [
    {
      name: "Back Market",
      comparisons: [
        {
          model: "ChatGPT‑4o",
          positives: ["lower defect rate", "longer warranty"],
          negatives: ["smaller catalogue"],
        },
        {
          model: "Claude 3",
          positives: ["more rigorous testing", "eco-friendly packaging"],
          negatives: ["slower shipping times"],
        },
        {
          model: "Mistral Large",
          positives: ["better customer service", "quality guarantee"],
          negatives: ["higher price point"],
        },
        {
          model: "Gemini 1.5 Pro",
          positives: ["transparent sourcing", "detailed product specs"],
          negatives: ["fewer payment options"],
        },
      ],
    },
    {
      name: "Amazon Renewed",
      comparisons: [
        {
          model: "ChatGPT‑4o",
          positives: ["better quality control", "longer warranty"],
          negatives: ["higher prices", "smaller selection"],
        },
        {
          model: "Claude 3",
          positives: ["more eco-friendly", "better customer service"],
          negatives: ["slower delivery"],
        },
        {
          model: "Mistral Large",
          positives: ["more detailed product information", "better return policy"],
          negatives: ["less brand variety"],
        },
        {
          model: "Gemini 1.5 Pro",
          positives: ["more transparent refurbishment process", "better packaging"],
          negatives: ["more expensive shipping"],
        },
      ],
    },
    {
      name: "Swappie",
      comparisons: [
        {
          model: "ChatGPT‑4o",
          positives: ["specialized in phones", "expert knowledge"],
          negatives: ["limited to Apple products"],
        },
        {
          model: "Claude 3",
          positives: ["detailed grading system", "transparent pricing"],
          negatives: ["limited international shipping"],
        },
        {
          model: "Mistral Large",
          positives: ["longer testing process", "better battery replacements"],
          negatives: ["higher prices", "fewer models"],
        },
        {
          model: "Gemini 1.5 Pro",
          positives: ["better warranty on batteries", "more detailed photos"],
          negatives: ["limited to smartphones only"],
        },
      ],
    },
    {
      name: "Gazelle",
      comparisons: [
        {
          model: "ChatGPT‑4o",
          positives: ["quick buying process", "instant quotes"],
          negatives: ["lower trade-in values", "US-focused"],
        },
        {
          model: "Claude 3",
          positives: ["easy selling process", "fast payment"],
          negatives: ["limited international presence"],
        },
        {
          model: "Mistral Large",
          positives: ["good condition verification", "30-day guarantee"],
          negatives: ["smaller selection", "fewer brands"],
        },
        {
          model: "Gemini 1.5 Pro",
          positives: ["easy trade-in process", "quick shipping"],
          negatives: ["less detailed product descriptions"],
        },
      ],
    },
  ]

  // Obtenir la liste unique des modèles
  const models = Array.from(new Set(competitors.flatMap((comp) => comp.comparisons.map((c) => c.model))))

  return (
    <div className="mb-16 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-900">Brand Battle vs Pre‑selected Competitors</h2>
        <p className="text-sm text-gray-600 mt-1">
          "Can you tell me the strengths and weaknesses of brand.com vs. competitor?"
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {competitors.map((competitor, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-base font-bold text-gray-800">
                  Brand vs <span className="text-[#805AD5]">{competitor.name}</span>
                </h3>
              </div>

              <div className="p-3">
                <div>
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 border-b-2 border-gray-200 w-[40px]"></th>
                        {models.map((model, mIndex) => {
                          // Extraire le nom court du modèle
                          const shortName = model
                            .replace("ChatGPT‑4o", "GPT")
                            .replace("Claude 3", "Claude")
                            .replace("Mistral Large", "Mistral")
                            .replace("Gemini 1.5 Pro", "Gemini")

                          return (
                            <th
                              key={mIndex}
                              className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-200"
                            >
                              {shortName}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Ligne des points positifs */}
                      <tr className="bg-[#E3F2FD]">
                        <td className="px-2 py-2 border-b border-gray-200 font-bold text-[#0D47A1] text-sm text-center">
                          <div className="flex items-center justify-center" title="Strengths">
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
                          const comparison = competitor.comparisons.find((c) => c.model === model)
                          return (
                            <td key={mIndex} className="px-2 py-2 border-b border-gray-200 text-xs">
                              {comparison?.positives.map((positive, pIndex) => (
                                <div key={pIndex} className="mb-1 flex items-start">
                                  <span className="text-[#2196F3] mr-1 mt-0.5 flex-shrink-0">•</span>
                                  <span className="text-gray-800">{positive}</span>
                                </div>
                              ))}
                            </td>
                          )
                        })}
                      </tr>
                      {/* Ligne des points négatifs */}
                      <tr className="bg-[#FCE4EC]">
                        <td className="px-2 py-2 font-bold text-[#AD1457] text-sm text-center">
                          <div className="flex items-center justify-center" title="Weaknesses">
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
                          const comparison = competitor.comparisons.find((c) => c.model === model)
                          return (
                            <td key={mIndex} className="px-2 py-2 text-xs">
                              {comparison?.negatives.map((negative, nIndex) => (
                                <div key={nIndex} className="mb-1 flex items-start">
                                  <span className="text-[#C2185B] mr-1 mt-0.5 flex-shrink-0">•</span>
                                  <span className="text-gray-800">{negative}</span>
                                </div>
                              ))}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bloc définition et méthodologie en bas */}
        <div className="border-t border-gray-100 pt-6 mt-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">What is Brand Battle Analysis?</h4>
          <p className="text-gray-600 mb-4">
            Brand Battle analysis compares your brand directly against specific competitors to identify perceived
            strengths and weaknesses across different AI models. This helps you understand your competitive positioning
            and messaging opportunities.
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
                <h5 className="text-sm font-medium text-blue-800">Methodology</h5>
                <ul className="mt-1 text-sm text-blue-700 list-disc pl-5 space-y-1">
                  <li>Competitors analyzed = {competitors.length}</li>
                  <li>Models tested = {models.length}</li>
                  <li>Direct comparison prompts used</li>
                  <li>Strengths and weaknesses extracted from responses</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
