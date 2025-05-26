interface ReportHeaderProps {
  brand: string;
  metadata: {
    url: string;
    market: string;
    flag: string;
    competitors: string;
    date: string;
    models: string;
  };
}

export default function ReportHeader({ brand, metadata }: ReportHeaderProps) {
  return (
    <div className="mb-12">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
        <span className="text-primary">{brand}</span> MINT
      </h1>
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center">
          <span className="text-lg mr-2">{metadata.flag}</span>
          <span className="text-gray-700 font-medium">
            {metadata.market.split("/")[0].trim()}
          </span>
        </div>
        <div className="w-px h-6 bg-gray-300"></div>
        <div className="flex items-center">
          <svg
            className="h-5 w-5 text-gray-500 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          <span className="text-gray-700 font-medium">
            {metadata.market.includes("/")
              ? metadata.market.split("/")[1].trim()
              : "English"}
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-b from-white to-gray-50 rounded-xl overflow-hidden shadow-lg border border-gray-200/60 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-white p-6 rounded-lg hover:bg-blue-50/30 transition-colors duration-300">
            <div className="flex items-start">
              <div className="bg-primary/10 p-3 rounded-lg mr-5 shadow-sm">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1.5">
                  Brand URL
                </p>
                <p className="font-medium text-gray-900 text-lg">
                  {metadata.url}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg hover:bg-blue-50/30 transition-colors duration-300">
            <div className="flex items-start">
              <div className="bg-primary/10 p-3 rounded-lg mr-5 shadow-sm">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1.5">
                  Competitors
                </p>
                <p className="font-medium text-gray-900 text-lg">
                  {metadata.competitors}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg hover:bg-blue-50/30 transition-colors duration-300">
            <div className="flex items-start">
              <div className="bg-primary/10 p-3 rounded-lg mr-5 shadow-sm">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1.5">
                  Date Run
                </p>
                <p className="font-medium text-gray-900 text-lg">
                  {metadata.date}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg hover:bg-blue-50/30 transition-colors duration-300">
            <div className="flex items-start">
              <div className="bg-primary/10 p-3 rounded-lg mr-5 shadow-sm">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1.5">
                  Models Tested
                </p>
                <p className="font-medium text-gray-900 text-lg">
                  {metadata.models}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
