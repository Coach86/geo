"use client";

import { InfoIcon } from "lucide-react";

interface TraceSectionProps {
  data: {
    consultedWebsites: Array<{
      url: string;
      count: number;
    }>;
  };
}

export default function TraceSection({ data }: TraceSectionProps) {
  if (!data?.consultedWebsites || data.consultedWebsites.length === 0) {
    return null;
  }

  // Calculate total count and percentages
  const totalCount = data.consultedWebsites.reduce((sum, site) => sum + site.count, 0);
  
  // Limit to top 6 sites and create "Others" entry for the rest
  const topSites = data.consultedWebsites.slice(0, 6);
  const otherSites = data.consultedWebsites.slice(6);
  
  const sitesWithPercentages = topSites.map(site => ({
    ...site,
    percentage: totalCount > 0 ? Math.round((site.count / totalCount) * 100) : 0
  }));

  // Add "Others" entry if there are more than 6 sites
  if (otherSites.length > 0) {
    const othersCount = otherSites.reduce((sum, site) => sum + site.count, 0);
    const othersPercentage = totalCount > 0 ? Math.round((othersCount / totalCount) * 100) : 0;
    sitesWithPercentages.push({
      url: 'others',
      count: othersCount,
      percentage: othersPercentage
    });
  }

  // Get friendly name for display
  const getFriendlyName = (url: string): string => {
    if (url === 'others') return 'Other';
    if (url.includes('youtube.com')) return 'YouTube';
    if (url.includes('reddit.com')) return 'Reddit';
    if (url.includes('wikipedia.org')) return 'Wikipedia';
    if (url.includes('techradar.com')) return 'TechRadar';
    if (url.includes('trustpilot.com')) return 'Trustpilot';
    if (url.includes('amazon.com')) return 'Amazon';
    if (url.includes('apple.com')) return 'Apple';
    if (url.includes('microsoft.com')) return 'Microsoft';
    if (url.includes('google.com')) return 'Google';
    
    // Extract domain name
    const domain = url.split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  };

  // Get color for each source
  const getSourceColor = (index: number): string => {
    const colors = [
      '#3182CE', // Blue
      '#805AD5', // Purple  
      '#38A169', // Green
      '#D69E2E', // Orange
      '#E53E3E', // Red
      '#00B5D8', // Cyan
      '#9F7AEA', // Light Purple
      '#718096', // Gray
    ];
    return colors[index % colors.length];
  };

  const topSource = sitesWithPercentages[0];

  return (
    <div className="mb-16 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Trace — Sources Breakdown
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Analysis of websites consulted by AI models when researching your brand.
            </p>
          </div>
          <a
            href="/glossary"
            className="text-gray-400 hover:text-primary transition-colors"
          >
            <InfoIcon className="h-5 w-5" />
          </a>
        </div>
      </div>

      <div className="p-6">
        {/* Top source display */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
            <div>
              <div className="flex items-center mb-1">
                <h3 className="text-3xl font-bold text-gray-900">
                  {getFriendlyName(topSource.url)}
                </h3>
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Top Source
                </span>
              </div>
              <p className="text-sm text-gray-600">
                with {topSource.percentage}% of references
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                Sources Analyzed
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {sitesWithPercentages.length}
              </div>
            </div>
          </div>
        </div>

        {/* Source Distribution Table */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Source Distribution
          </h4>
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
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
                {sitesWithPercentages.map((site, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: getSourceColor(index) }}
                        />
                        <span className="font-medium">
                          {getFriendlyName(site.url)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200 font-semibold">
                      {site.percentage}%
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      {site.url === 'others' ? (
                        <span className="text-gray-500 text-sm italic">
                          {otherSites.length} additional sources
                        </span>
                      ) : (
                        <a
                          href={`https://${site.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        >
                          https://{site.url}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Methodology section */}
        <div className="border-t border-gray-100 pt-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            What is Trace Analysis?
          </h4>
          <p className="text-gray-600 mb-4">
            Trace analysis identifies the sources that AI models reference when discussing your brand. 
            By tracking which websites are consulted during AI research, we can understand which online 
            sources have the most influence on AI perceptions of your brand.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-start">
              <a href="/glossary" className="flex-shrink-0 mt-0.5">
                <InfoIcon className="h-5 w-5 text-blue-500 hover:text-blue-700 transition-colors" />
              </a>
              <div className="ml-3">
                <h5 className="text-sm font-medium text-blue-800">
                  Methodology
                </h5>
                <ul className="mt-1 text-sm text-blue-700 list-disc pl-5 space-y-1">
                  <li>Total website references tracked = {totalCount}</li>
                  <li>Unique sources identified = {data.consultedWebsites.length}</li>
                  <li>Data collected across all analysis pipelines</li>
                  <li>URLs normalized to prevent duplicate counting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}