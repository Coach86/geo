// Centralized dimension configuration
export const DIMENSIONS = {
  technical: {
    id: 'technical',
    name: 'Technical',
    displayName: 'Technical',
    color: '#0EA5E9',     // Sky blue
    description: 'Technical SEO and implementation quality',
    icon: 'Code' // Icon name from lucide-react
  },
  structure: {
    id: 'structure',
    name: 'Structure',
    displayName: 'Structure',
    color: '#F59E0B',     // Amber/Orange
    description: 'Content structure and organization',
    icon: 'Database'
  },
  authority: {
    id: 'authority',
    name: 'Authority',
    displayName: 'Authority',
    color: '#8B5CF6',     // Purple
    description: 'Domain and page authority signals',
    icon: 'CheckCircle'
  },
  quality: {
    id: 'quality',
    name: 'Quality',
    displayName: 'Quality',
    color: '#0D9488',     // Teal
    description: 'Content quality and brand alignment',
    icon: 'AlertCircle'
  }
} as const;

// Type for dimension keys
export type DimensionKey = keyof typeof DIMENSIONS;

// Type for dimension object
export type Dimension = typeof DIMENSIONS[DimensionKey];

// Array of dimension keys in display order
export const DIMENSION_ORDER: DimensionKey[] = ['technical', 'authority', 'structure', 'quality'];

// Helper function to get dimension by id
export const getDimensionById = (id: string): Dimension | undefined => {
  return DIMENSIONS[id as DimensionKey];
};

// Helper function to get dimension color
export const getDimensionColor = (dimension: string): string => {
  const dim = getDimensionById(dimension.toLowerCase());
  return dim?.color || '#6b7280'; // Gray fallback
};

// Helper function to get dimension display name
export const getDimensionDisplayName = (dimension: string): string => {
  const dim = getDimensionById(dimension.toLowerCase());
  return dim?.displayName || dimension.charAt(0).toUpperCase() + dimension.slice(1);
};

// Helper function to get all dimensions as array
export const getDimensionsArray = (): Dimension[] => {
  return DIMENSION_ORDER.map(key => DIMENSIONS[key]);
};

// Export dimension colors for backward compatibility
export const DIMENSION_COLORS = Object.entries(DIMENSIONS).reduce((acc, [key, dim]) => {
  acc[key as DimensionKey] = dim.color;
  return acc;
}, {} as Record<DimensionKey, string>);