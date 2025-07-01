export interface PageSignals {
  content: {
    h1Text: string;
    metaDescription: string;
    wordCount: number;
    hasAuthor: boolean;
    hasByline: boolean;
    hasAuthorBio: boolean;
    authorName?: string;
    citationCount: number;
    internalLinkCount: number;
    externalLinkCount: number;
    hasSources: boolean;
    hasReferences: boolean;
    academicSourceCount: number;
    newsSourceCount: number;
    industrySourceCount: number;
  };
  structure: {
    h1Count: number;
    headingHierarchy: string[];
    listCount: number;
    schemaTypes: string[];
    hasSchema: boolean;
    wordCount: number;
    avgSentenceWords: number;
    headingHierarchyScore: number;
  };
  freshness: {
    publishDate?: Date;
    modifiedDate?: Date;
    hasDateInUrl: boolean;
    hasDateInTitle: boolean;
    yearMentionCount: number;
    updateIndicators: string[];
    contentAge?: number;
  };
  brand: {
    brandMentionCount: number;
    competitorMentionCount: number;
    brandInTitle: boolean;
    brandInH1: boolean;
    brandInUrl: boolean;
    brandProminence: number;
    contextQuality: string[];
  };
  snippet: {
    qaBlockCount: number;
    listItemCount: number;
    avgSentenceLength: number;
    definitionCount: number;
    hasStructuredData: boolean;
    stepCount: number;
    bulletPoints: number;
  };
}