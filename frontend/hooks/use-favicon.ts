import { useState, useEffect, useRef } from 'react';

interface FaviconCache {
  [domain: string]: {
    url: string | null;
    timestamp: number;
  };
}

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const FAVICON_PROVIDERS = [
  (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
  (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  (domain: string) => `https://favicon.im/${domain}?larger=true`,
];

// In-memory cache for the session
const memoryCache: FaviconCache = {};

// Load cache from localStorage
const loadCache = (): FaviconCache => {
  if (typeof window === 'undefined') return {};
  
  try {
    const cached = localStorage.getItem('faviconCache');
    if (cached) {
      const parsed = JSON.parse(cached);
      // Clean up expired entries
      const now = Date.now();
      const cleaned: FaviconCache = {};
      
      Object.entries(parsed).forEach(([domain, data]: [string, any]) => {
        if (data.timestamp && now - data.timestamp < CACHE_DURATION) {
          cleaned[domain] = data;
        }
      });
      
      return cleaned;
    }
  } catch (error) {
    console.error('Error loading favicon cache:', error);
  }
  
  return {};
};

// Save cache to localStorage
const saveCache = (cache: FaviconCache) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('faviconCache', JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving favicon cache:', error);
  }
};

// Test if an image URL is valid
const testImageUrl = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

// Get the best favicon URL for a domain
const getFaviconUrl = async (domain: string): Promise<string | null> => {
  // Check memory cache first
  if (memoryCache[domain]) {
    return memoryCache[domain].url;
  }
  
  // Check localStorage cache
  const localCache = loadCache();
  if (localCache[domain]) {
    memoryCache[domain] = localCache[domain];
    return localCache[domain].url;
  }
  
  // Try different favicon providers
  for (const provider of FAVICON_PROVIDERS) {
    const url = provider(domain);
    const isValid = await testImageUrl(url);
    
    if (isValid) {
      // Update caches
      const cacheEntry = { url, timestamp: Date.now() };
      memoryCache[domain] = cacheEntry;
      localCache[domain] = cacheEntry;
      saveCache(localCache);
      
      return url;
    }
  }
  
  // Cache the failure to avoid repeated attempts
  const cacheEntry = { url: null, timestamp: Date.now() };
  memoryCache[domain] = cacheEntry;
  localCache[domain] = cacheEntry;
  saveCache(localCache);
  
  return null;
};

// Extract domain from URL
const getDomainFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
};

export function useFavicon(domain: string | null | undefined) {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (!domain || domain === 'No link') {
      setFaviconUrl(null);
      return;
    }
    
    const fetchFavicon = async () => {
      setLoading(true);
      
      try {
        const url = await getFaviconUrl(domain);
        if (mountedRef.current) {
          setFaviconUrl(url);
        }
      } catch (error) {
        console.error('Error fetching favicon:', error);
        if (mountedRef.current) {
          setFaviconUrl(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };
    
    fetchFavicon();
  }, [domain]);
  
  return { faviconUrl, loading };
}

// Batch favicon fetching for better performance
export function useFavicons(domains: (string | null | undefined)[]) {
  const [favicons, setFavicons] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  useEffect(() => {
    const validDomains = domains.filter(
      (domain): domain is string => !!domain && domain !== 'No link'
    );
    
    if (validDomains.length === 0) {
      setFavicons({});
      return;
    }
    
    const fetchFavicons = async () => {
      setLoading(true);
      const results: Record<string, string | null> = {};
      
      // Fetch favicons in parallel with a limit
      const batchSize = 10;
      for (let i = 0; i < validDomains.length; i += batchSize) {
        const batch = validDomains.slice(i, i + batchSize);
        const promises = batch.map(async (domain) => {
          const url = await getFaviconUrl(domain);
          return { domain, url };
        });
        
        const batchResults = await Promise.all(promises);
        batchResults.forEach(({ domain, url }) => {
          results[domain] = url;
        });
        
        if (mountedRef.current) {
          setFavicons({ ...results });
        }
      }
      
      if (mountedRef.current) {
        setLoading(false);
      }
    };
    
    fetchFavicons();
  }, [domains.join(',')]);
  
  return { favicons, loading };
}

// Utility to extract domain from various URL formats
export function extractDomain(urlOrDomain: string): string {
  // If it's already a domain (no protocol), return as is
  if (!urlOrDomain.includes('://')) {
    return urlOrDomain.replace('www.', '');
  }
  
  // Otherwise, extract domain from URL
  return getDomainFromUrl(urlOrDomain) || urlOrDomain;
}