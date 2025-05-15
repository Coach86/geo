"use client"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts"
import Link from "next/link"

interface TraceSectionProps {
  data: {
    sources: {
      name: string
      percentage: number
      color: string
      url?: string
    }[]
    modelStats?: {
      model: string
      webAccessRate: number
    }[]
  }
}

export default function TraceSection({ data }: TraceSectionProps) {
  // Données de démonstration pour les URLs des sources si non fournies
  const sourcesWithUrls = data.sources.map((source) => {
    if (source.url) return source

    // Générer une URL de démonstration si non fournie
    let demoUrl = ""
    switch (source.name) {
      case "YouTube":
        demoUrl = "https://www.youtube.com/results?search_query=brand+reviews"
        break
      case "Reddit":
        demoUrl = "https://www.reddit.com/search/?q=brand+reviews"
        break
      case "Official Site":
        demoUrl = "https://www.brand.com"
        break
      case "TechRadar":
        demoUrl = "https://www.techradar.com/reviews/brand"
        break
      case "Trustpilot":
        demoUrl = "https://www.trustpilot.com/review/brand.com"
        break
      case "Wikipedia":
        demoUrl = "https://en.wikipedia.org/wiki/Brand"
        break
      default:
        demoUrl = `https://www.${source.name.toLowerCase().replace(/\s+/g, "")}.com`
    }

    return { ...source, url: demoUrl }
  })

  // Données de démonstration pour les statistiques des modèles si non fournies
  const modelStats = data.modelStats || [
    { model: "ChatGPT‑4o", webAccessRate: 85 },
    { model: "Claude 3", webAccessRate: 92 },
    { model: "Mistral Large", webAccessRate: 78 },
    { model: "Gemini 1.5 Pro", webAccessRate: 88 },
  ]

  // Préparer les données pour le graphique des modèles
  const modelChartData = modelStats.map((stat) => ({
    name: stat.model,
    value: stat.webAccessRate,
    color: getBarColor(stat.webAccessRate),
  }))

  // Fonction pour obtenir la couleur de la barre en fonction de la valeur
  function getBarColor(value: number) {
    // Utiliser des teintes de bleu comme dans les exemples Carta
    return "#64B5F6" // bleu clair comme dans les exemples Carta
  }

  return (
    <div className="mb-16 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-900">Trace — Sources Breakdown</h2>
      </div>

      <div className="p-6">
        {/* 1. Score global en haut en gros */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
            <div>
              <div className="flex items-center mb-1">
                <h3 className="text-3xl font-bold text-gray-900">{sourcesWithUrls[0]?.name || "YouTube"}</h3>
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Top Source
                </span>
              </div>
              <p className="text-sm text-gray-600">with {sourcesWithUrls[0]?.percentage || "22"}% of references</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">Sources Analyzed</div>
              <div className="text-2xl font-bold text-gray-900">{sourcesWithUrls.length}</div>
            </div>
          </div>
        </div>

        {/* 2. Détails des résultats au milieu */}
        <div className="mb-10">
          <h4 className="text-lg font-semibold mb-4 text-gray-800">Source Distribution</h4>

          <div className="overflow-x-auto mb-10">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                    Percentage
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                    URL
                  </th>
                </tr>
              </thead>
              <tbody>
                {sourcesWithUrls.map((source, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 border-b border-gray-200 font-medium">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: source.color }}></div>
                        {source.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200">{source.percentage}%</td>
                    <td className="px-4 py-3 border-b border-gray-200 text-blue-600 hover:text-blue-800">
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {source.url}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="text-lg font-semibold mb-4 text-gray-800">
            Web Access Rate by Model
            <Link href="/glossary" className="ml-2 text-gray-500 hover:text-gray-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-5 h-5 inline-block align-middle"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.02m-1.063-3.07l3.072 3.07m-6.5 6.5a5.25 5.25 0 007.437.166l3.89-3.89a5.25 5.25 0 00-7.437-7.437l-3.89 3.89a5.25 5.25 0 00.166 7.437z"
                />
              </svg>
            </Link>
          </h4>

          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#374151", fontWeight: 500 }} />
                <RechartsTooltip
                  formatter={(value) => [`${value}%`, "Web Access Rate"]}
                  labelFormatter={(label) => `Model: ${label}`}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                  {modelChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#B3E0FF" />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(value: any) => `${value}%`}
                    style={{
                      fill: "#111827",
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Bloc définition et méthodologie en bas */}
        <div className="border-t border-gray-100 pt-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">What is Trace Analysis?</h4>
          <p className="text-gray-600 mb-4">
            Trace analysis identifies the sources that AI models reference when discussing your brand, and how
            frequently they access the web for information. This helps you understand which online sources have the most
            influence on AI perceptions of your brand.
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
                  <li>Sources analyzed = {sourcesWithUrls.length}</li>
                  <li>Models tested = {modelStats.length}</li>
                  <li>Web access tracked across all prompts</li>
                  <li>Citations and references extracted from responses</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
