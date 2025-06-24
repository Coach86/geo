export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Build CSV content
  const csvContent = [
    // Headers row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

export function formatDomainDataForCSV(domains: Array<{ domain: string; count: number; percentage?: number }>) {
  return domains.map((item, index) => ({
    'Rank': index + 1,
    'Domain': item.domain,
    'Citations': item.count,
    'Percentage': `${item.percentage ?? 0}%`
  }));
}

export function formatMentionsDataForCSV(mentions: Array<{ mention: string; count: number; percentage?: number }>) {
  return mentions.map((item, index) => ({
    'Rank': index + 1,
    'Brand/Company': item.mention,
    'Mentions': item.count,
    'Share of Voice': `${item.percentage ?? 0}%`
  }));
}

export function formatDomainSourceDataForCSV(
  data: {
    brandDomainPercentage: number;
    otherSourcesPercentage: number;
    brandDomainCount: number;
    otherSourcesCount: number;
  },
  brandName: string
) {
  return [
    {
      'Source Type': `${brandName} Domain`,
      'Citations': data.brandDomainCount,
      'Percentage': `${data.brandDomainPercentage}%`
    },
    {
      'Source Type': 'Other Sources',
      'Citations': data.otherSourcesCount,
      'Percentage': `${data.otherSourcesPercentage}%`
    }
  ];
}