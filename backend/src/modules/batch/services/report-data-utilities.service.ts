import { Injectable } from '@nestjs/common';

/**
 * Service responsible for shared utility functions used across report building services.
 * Handles domain extraction, brand name extraction, and common counting logic.
 */
@Injectable()
export class ReportDataUtilitiesService {
  /**
   * Extract brand name from project website URL
   * @param projectWebsite The project website URL
   * @returns The extracted brand name or null
   */
  extractBrandNameFromProject(projectWebsite?: string): string | null {
    if (!projectWebsite) return null;
    
    try {
      const url = new URL(projectWebsite);
      const domain = url.hostname.replace(/^www\./, '');
      // Extract the main part of the domain (before TLD)
      const parts = domain.split('.');
      if (parts.length >= 2) {
        return parts[0]; // Return the first part as brand name
      }
      return domain;
    } catch (e) {
      return null;
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url: string): string {
    try {
      if (!url) return '';
      // Handle URLs that might not have protocol
      const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(urlWithProtocol);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url; // Return as-is if not a valid URL
    }
  }

  /**
   * Count total prompts executed across all results
   */
  countPromptsExecuted(...results: any[]): number {
    let count = 0;
    results.forEach(result => {
      if (result?.results) {
        count += result.results.length;
      }
    });
    return count;
  }

  /**
   * Extract brand domain from website URL (without TLD)
   */
  extractBrandDomain(website: string): string {
    try {
      const url = new URL(website);
      const hostname = url.hostname.replace('www.', '');
      // Extract domain name without TLD (e.g., "sfr" from "sfr.fr")
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        return parts[0]; // Return the first part before the TLD
      }
      return hostname;
    } catch {
      return '';
    }
  }

  /**
   * Check if a domain matches the brand domain
   */
  isDomainMatch(domain: string, brandDomain: string): boolean {
    if (!domain || !brandDomain) return false;
    
    // Remove www. prefix if present
    const cleanDomain = domain.replace('www.', '');
    
    // Check if the domain contains the brand domain
    // This will match "sfr.fr", "sfr.com", "business.sfr.fr", etc.
    return cleanDomain.includes(brandDomain + '.');
  }
}