"use client"

interface ArenaSectionProps {
  data: {
    competitors: {
      name: string
      chatgpt: number
      claude: number
      mistral: number
      gemini: number
      global: string
      size: string
      sentiment: string
    }[]
  }
}

export default function ArenaSection({ data }: ArenaSectionProps) {
  // Trier les concurrents par global en ordre décroissant (fixe, sans bouton)
  const sortedCompetitors = [...data.competitors].sort((a, b) => {
    const aValue = Number.parseFloat(a.global.replace("%", ""))
    const bValue = Number.parseFloat(b.global.replace("%", ""))
    return bValue - aValue
  })

  // Fonction pour s'assurer que les valeurs sont affichées avec le symbole %
  const formatPercentage = (value: string | number) => {
    if (typeof value === "string") {
      // Si la valeur est déjà une chaîne, vérifier si elle se termine par %
      return value.endsWith("%") ? value : `${value}%`
    }
    // Si c'est un nombre, le convertir en chaîne et ajouter %
    return `${value}%`
  }

  // Nouvelle palette de couleurs professionnelle pour Arena
  const professionalColors = {
    primary: "#805AD5", // Violet principal
    secondary: "#9F7AEA", // Violet secondaire
    tertiary: "#B794F4", // Violet tertiaire
    light: "#D6BCFA", // Violet clair
    lighter: "#E9D8FD", // Violet très clair
    bg: "#FAF5FF", // Fond violet très pâle
  }

  // Fonction pour obtenir la couleur en fonction du sentiment - Style professionnel
  function getSentimentColor(sentiment: string, index: number) {
    // Utiliser des teintes de violet comme couleur professionnelle
    const violetShades = [
      "#553C9A", // Violet foncé
      "#6B46C1",
      "#805AD5",
      "#9F7AEA",
      "#B794F4", // Violet moyen
      "#D6BCFA",
      "#E9D8FD",
    ]

    // Utiliser l'index pour varier la teinte, avec un ajustement selon le sentiment
    const baseIndex = index % violetShades.length
    let colorIndex = baseIndex

    if (sentiment === "positive") {
      colorIndex = Math.min(baseIndex, 2) // Plus foncé pour positif
    } else if (sentiment === "negative") {
      colorIndex = Math.min(baseIndex + 4, violetShades.length - 1) // Plus clair pour négatif
    } else {
      colorIndex = Math.min(baseIndex + 2, violetShades.length - 1) // Moyen pour neutre
    }

    return violetShades[colorIndex]
  }

  return (
    <div className="mb-16 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-900">Arena — Competitive Landscape</h2>
        <p className="text-sm text-gray-600 mt-1">
          Surface competitive naming and intensity in models' responses (from Pulse prompts)
        </p>
      </div>

      <div className="p-6">
        {/* 1. Score global en haut en gros */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
            <div>
              <div className="flex items-center mb-1">
                <h3 className="text-3xl font-bold text-gray-900">{sortedCompetitors[0]?.name || "N/A"}</h3>
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                  Top Competitor
                </span>
              </div>
              <p className="text-sm text-gray-600">with {sortedCompetitors[0]?.global || "N/A"} visibility</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">Competitors Analyzed</div>
              <div className="text-2xl font-bold text-gray-900">{data.competitors.length}</div>
            </div>
          </div>
        </div>

        {/* 2. Détails des résultats au milieu */}
        <div className="mb-8">
          <div className="max-w-full mx-auto">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Competitor Comparison</h4>
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      Brand
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      ChatGPT
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      Claude
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      Mistral
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      Gemini
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      Global %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCompetitors.map((competitor, index) => {
                    const color = getSentimentColor(competitor.sentiment, index)

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></div>
                            <span className="font-medium">{competitor.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center border-b border-gray-200">
                          {formatPercentage(competitor.chatgpt)}
                        </td>
                        <td className="px-4 py-3 text-center border-b border-gray-200">
                          {formatPercentage(competitor.claude)}
                        </td>
                        <td className="px-4 py-3 text-center border-b border-gray-200">
                          {formatPercentage(competitor.mistral)}
                        </td>
                        <td className="px-4 py-3 text-center border-b border-gray-200">
                          {formatPercentage(competitor.gemini)}
                        </td>
                        <td className="px-4 py-3 text-center border-b border-gray-200 font-bold">
                          {formatPercentage(competitor.global)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. Bloc définition et méthodologie en bas */}
        <div className="border-t border-gray-100 pt-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">What is Arena Analysis?</h4>
          <p className="text-gray-600 mb-4">
            Arena analysis identifies which competitors are most frequently mentioned alongside your brand in AI
            responses, and how your brand compares to them in terms of visibility and sentiment.
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
                  <li>Competitors analyzed = {data.competitors.length}</li>
                  <li>Models tested = 4</li>
                  <li>Bubble size indicates mention frequency</li>
                  <li>Color indicates sentiment (darker = more positive)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
