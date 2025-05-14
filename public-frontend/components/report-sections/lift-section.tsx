interface LiftSectionProps {
  data: {
    recommendations: {
      text: string
      priority: string
      priorityClass: string
      effort: string
      effortClass: string
    }[]
  }
}

export default function LiftSection({ data }: LiftSectionProps) {
  return (
    <div className="mb-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Lift — Optimisation Recommendations
        </h2>
        <p className="text-sm text-blue-100 mt-1">
          Actionable steps to improve your brand's visibility and perception in AI responses
        </p>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Key Recommendations</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                    Recommendation
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                    Effort
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recommendations.map((rec, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 border-b border-gray-200">
                      <div className="font-medium">{rec.text}</div>
                    </td>
                    <td
                      className={`px-4 py-3 border-b border-gray-200 ${
                        rec.priorityClass === "priority-high"
                          ? "text-red-600"
                          : rec.priorityClass === "priority-medium"
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-opacity-10 border"
                        style={{
                          backgroundColor:
                            rec.priorityClass === "priority-high"
                              ? "rgba(239, 68, 68, 0.1)"
                              : rec.priorityClass === "priority-medium"
                                ? "rgba(245, 158, 11, 0.1)"
                                : "rgba(16, 185, 129, 0.1)",
                          borderColor:
                            rec.priorityClass === "priority-high"
                              ? "rgb(239, 68, 68)"
                              : rec.priorityClass === "priority-medium"
                                ? "rgb(245, 158, 11)"
                                : "rgb(16, 185, 129)",
                        }}
                      >
                        {rec.priority}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 border-b border-gray-200 ${
                        rec.effortClass === "effort-easy"
                          ? "text-green-600"
                          : rec.effortClass === "effort-medium"
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-opacity-10 border"
                        style={{
                          backgroundColor:
                            rec.effortClass === "effort-easy"
                              ? "rgba(16, 185, 129, 0.1)"
                              : rec.effortClass === "effort-medium"
                                ? "rgba(245, 158, 11, 0.1)"
                                : "rgba(239, 68, 68, 0.1)",
                          borderColor:
                            rec.effortClass === "effort-easy"
                              ? "rgb(16, 185, 129)"
                              : rec.effortClass === "effort-medium"
                                ? "rgb(245, 158, 11)"
                                : "rgb(239, 68, 68)",
                        }}
                      >
                        {rec.effort}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-blue-500">
            <h4 className="font-semibold text-gray-800 mb-2">Improve Visibility</h4>
            <p className="text-gray-600 text-sm">
              Implement these recommendations to increase your brand's visibility in AI responses.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-purple-500">
            <h4 className="font-semibold text-gray-800 mb-2">Enhance Perception</h4>
            <p className="text-gray-600 text-sm">
              These actions will help improve sentiment and brand alignment in AI responses.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-green-500">
            <h4 className="font-semibold text-gray-800 mb-2">Outperform Competitors</h4>
            <p className="text-gray-600 text-sm">
              Strategic actions to strengthen your position against competitors in AI responses.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Ready to implement these recommendations?</h3>
              <p className="text-blue-100">
                Our team can help you execute these strategies to improve your brand's presence in AI responses.
              </p>
            </div>
            <button className="px-6 py-3 bg-white text-blue-600 font-medium rounded-lg shadow-sm hover:bg-blue-50 transition-colors">
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
