// Centralized color constants for dimensions across all components
export const DIMENSION_COLORS = {
  technical: '#0EA5E9',     // Sky blue - distinct from overall
  structure: '#F59E0B',     // Amber/Orange - warm color
  authority: '#8B5CF6',     // Purple - distinct from blue
  quality: '#0D9488', // Teal - distinct from all others
} as const;

// Helper function to get dimension color
export const getDimensionColor = (dimension: string): string => {
  const normalizedDimension = dimension.toLowerCase().replace(/[^a-z]/g, '');
  
  // Handle various dimension name formats
  if (normalizedDimension.includes('technical')) return DIMENSION_COLORS.technical;
  if (normalizedDimension.includes('structure') || normalizedDimension.includes('content')) return DIMENSION_COLORS.structure;
  if (normalizedDimension.includes('authority')) return DIMENSION_COLORS.authority;
  if (normalizedDimension.includes('monitoring') || normalizedDimension.includes('kpi')) return DIMENSION_COLORS.quality;
  
  // Fallback
  return '#6b7280'; // Gray
};

// Severity colors (can be used across components as well)
export const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316', 
  medium: '#eab308',
  low: '#3b82f6',
} as const;