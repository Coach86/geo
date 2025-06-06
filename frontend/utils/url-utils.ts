/**
 * Extract hostname from a URL string, handling various formats
 * @param url - The URL string to parse
 * @returns The hostname or null if parsing fails
 */
export function extractHostname(url: string | undefined | null): string | null {
  if (!url) return null;
  
  // Clean and normalize the URL
  let urlString = url.trim();
  
  // Remove trailing slashes
  urlString = urlString.replace(/\/+$/, '');
  
  // Add protocol if missing
  if (!urlString.match(/^https?:\/\//)) {
    urlString = 'https://' + urlString;
  }
  
  try {
    const urlObj = new URL(urlString);
    return urlObj.hostname;
  } catch {
    // Fallback: extract domain manually
    const match = urlString.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Check if a project's URL matches a given domain
 * @param projectUrl - The project's URL
 * @param domain - The domain to match against
 * @returns True if the project's URL matches the domain
 */
export function projectMatchesDomain(projectUrl: string | undefined | null, domain: string): boolean {
  const hostname = extractHostname(projectUrl);
  return hostname === domain;
}