"use client";

interface AccordSectionProps {
  data: {
    attributes: {
      name: string;
      rate: string;
      alignment: string;
    }[];
    score: {
      value: string;
      status: string;
    };
  };
}

export default function AccordSection({ data }: AccordSectionProps) {
  // Trier les attributs par taux de mention en ordre décroissant (fixe, sans bouton)
  const sortedAttributes = [...data.attributes].sort((a, b) => {
    const aValue = Number.parseInt(a.rate);
    const bValue = Number.parseInt(b.rate);
    return bValue - aValue;
  });

  // Fonction pour convertir les symboles en texte
  const getAlignmentText = (alignment: string) => {
    switch (alignment) {
      case "✅":
        return "High";
      case "⚠️":
        return "Medium";
      case "❌":
        return "Low";
      default:
        return alignment;
    }
  };

  // Nouvelle palette de couleurs professionnelle
  const professionalColors = {
    high: {
      text: "#2C5282",
      bg: "#E6F0F9",
      border: "#3182CE",
    },
    medium: {
      text: "#4A5568",
      bg: "#EDF2F7",
      border: "#718096",
    },
    low: {
      text: "#9B2C2C",
      bg: "#FEF1F5",
      border: "#E53E3E",
    },
  };

  // Remplacer les fonctions getAlignmentClass et getAlignmentBgClass
  const getAlignmentClass = (alignment: string) => {
    switch (alignment) {
      case "✅":
      case "High":
        return "text-[#0D47A1] font-medium";
      case "⚠️":
      case "Medium":
        return "text-[#4527A0] font-medium";
      case "❌":
      case "Low":
        return "text-[#AD1457] font-medium";
      default:
        return "text-gray-600";
    }
  };

  const getAlignmentBgClass = (alignment: string) => {
    switch (alignment) {
      case "✅":
      case "High":
        return "bg-[#E3F2FD]";
      case "⚠️":
      case "Medium":
        return "bg-[#EDE7F6]";
      case "❌":
      case "Low":
        return "bg-[#FCE4EC]";
      default:
        return "bg-gray-50";
    }
  };

  // Calculer les statistiques
  const highCount = data.attributes.filter(
    (attr) => attr.alignment === "✅" || attr.alignment === "High"
  ).length;

  const mediumCount = data.attributes.filter(
    (attr) => attr.alignment === "⚠️" || attr.alignment === "Medium"
  ).length;

  const lowCount = data.attributes.filter(
    (attr) => attr.alignment === "❌" || attr.alignment === "Low"
  ).length;

  // Préparer les données pour le graphique
  const chartData = [
    { name: "High", value: highCount, color: "#3182CE" },
    { name: "Medium", value: mediumCount, color: "#718096" },
    { name: "Low", value: lowCount, color: "#E53E3E" },
  ];

  return (
    <div className="mb-16 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-900">
          Accord — Brand Compliance
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Models' responses alignement with provided brand book and expected
          brand attributes
        </p>
      </div>

      <div className="p-6">
        {/* 1. Score global en haut en gros */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
            <div>
              <div className="flex items-center mb-1">
                <h3 className="text-3xl font-bold text-gray-900">
                  {data.score.value}
                </h3>
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Compliance Score
                </span>
              </div>
              <p className="text-sm text-gray-600">brand attribute alignment</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                Attributes Tested
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.attributes.length}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Détails des résultats au milieu */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="md:col-span-3">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              Attribute Alignment
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      Attribute
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      Mention Rate
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      Alignment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAttributes.map((attribute, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-b border-gray-200">
                        {attribute.name}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center">
                          {/* Remplacer les couleurs des barres de progression */}
                          <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className="h-2.5 rounded-full"
                              style={{
                                width: attribute.rate,
                                backgroundColor:
                                  Number.parseInt(attribute.rate) >= 60
                                    ? "#2196F3"
                                    : Number.parseInt(attribute.rate) >= 40
                                    ? "#673AB7"
                                    : "#C2185B",
                              }}
                            ></div>
                          </div>
                          <span>{attribute.rate}</span>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 border-b border-gray-200 ${getAlignmentClass(
                          attribute.alignment
                        )}`}
                      >
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAlignmentBgClass(
                            attribute.alignment
                          )}`}
                        >
                          {getAlignmentText(attribute.alignment)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              Alignment Summary
            </h4>
            {/* Remplacer les couleurs du score final */}
            <div
              className={`p-4 rounded-lg mb-4 ${
                data.score.status === "green"
                  ? "bg-[#E3F2FD] border-l-4 border-l-[#2196F3]"
                  : data.score.status === "yellow"
                  ? "bg-[#EDE7F6] border-l-4 border-l-[#673AB7]"
                  : "bg-[#FCE4EC] border-l-4 border-l-[#C2185B]"
              }`}
            >
              <div className="text-sm font-semibold text-gray-600 mb-1">
                Final Compliance Score
                <a
                  href="/glossary"
                  className="ml-1 text-gray-400 hover:text-gray-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-4 h-4 inline-block align-text-top"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </a>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {data.score.value}
              </div>
            </div>

            {/* Remplacer les couleurs du résumé statistique */}
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-[#E3F2FD] rounded">
                <span className="text-sm font-medium text-[#0D47A1]">
                  High Alignment
                </span>
                <span className="font-bold text-[#0D47A1]">{highCount}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-[#EDE7F6] rounded">
                <span className="text-sm font-medium text-[#4527A0]">
                  Medium Alignment
                </span>
                <span className="font-bold text-[#4527A0]">{mediumCount}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-[#FCE4EC] rounded">
                <span className="text-sm font-medium text-[#AD1457]">
                  Low Alignment
                </span>
                <span className="font-bold text-[#AD1457]">{lowCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bloc définition et méthodologie en bas */}
        <div className="border-t border-gray-100 pt-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            What is Accord Score?
          </h4>
          <p className="text-gray-600 mb-4">
            Accord score measures how well AI models' descriptions of your brand
            align with your desired brand attributes and messaging. A higher
            score indicates better alignment with your brand identity.
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
                  <li>
                    Accord Score (x/10) = (Sum of Attribute scoring by LLM) /
                    Total attributes tested
                  </li>
                  <li>Attribute scoring by gpt-4o</li>
                  <li>
                    Paramètres : {data.attributes.length} attributes tested
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
