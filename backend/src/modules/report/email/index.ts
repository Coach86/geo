/**
 * Brand Intelligence Email Report
 *
 * This module exports components for creating brand intelligence reports
 * using the ReactEmail library for consistent, responsive email rendering.
 */

// Export main templates
export { default as BrandIntelligenceReport } from './templates/BrandIntelligenceReport';
export { default as ReportAccessEmail } from './templates/ReportAccessEmail';

// Export individual components
export { default as Layout } from './components/Layout';
export { default as Header } from './components/Header';
export { default as Footer } from './components/Footer';

// Export report section components
export { default as ReportHeader } from './components/report-sections/ReportHeader';
export { default as ExecutiveSummary } from './components/report-sections/ExecutiveSummary';
export { default as PulseSection } from './components/report-sections/PulseSection';
export { default as ToneSection } from './components/report-sections/ToneSection';
export { default as AccordSection } from './components/report-sections/AccordSection';
export { default as ArenaSection } from './components/report-sections/ArenaSection';
export { default as ArenaBattleSection } from './components/report-sections/ArenaBattleSection';

// Export utilities
export { default as colors } from './utils/colors';

// Export types
export * from './utils/types';
