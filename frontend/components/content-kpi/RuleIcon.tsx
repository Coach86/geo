import React from 'react';
import {
  // Authority icons
  User,
  FileText,
  Megaphone,
  Database,
  BookOpen,
  
  // Content icons
  Link,
  Play,
  ArrowRightLeft,
  Heading1,
  Heading2,
  Image,
  FileText as FileDescription,
  MessageSquare,
  Calendar,
  BookMarked,
  Wrench,
  HelpCircle,
  Zap,
  FileQuestion,
  Bookmark,
  
  // Technical icons
  Shield,
  Bot,
  Map,
  Search,
  Smartphone,
  Activity,
  Code,
  Globe,
  Layout,
  
  // Fallback
  Info,
} from 'lucide-react';

import { DIMENSION_COLORS, getDimensionColor } from '@/lib/constants/colors';

interface RuleIconProps {
  ruleId: string;
  category: 'technical' | 'content' | 'authority' | 'quality';
  className?: string;
  showBackground?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Comprehensive mapping of all rule IDs to their specific icons
const RULE_ICON_MAP: Record<string, React.ComponentType<any>> = {
  // Authority Rules
  'author-credentials-bio-pages': User,
  'industry-publication-contributions': FileText,
  'press-release-distribution': Megaphone,
  'wikidata-presence': Database,
  'wikipedia-presence': BookOpen,
  
  // Content Rules
  'citing_sources': Link,
  'multimodal_content': Play,
  'comparison_content': ArrowRightLeft,
  'main_heading': Heading1,
  'subheadings': Heading2,
  'image-alt': Image,
  'meta_description': FileDescription,
  'concise_answers': MessageSquare,
  'content_freshness': Calendar,
  'in_depth_guides': BookMarked,
  'how_to_content': Wrench,
  'definitional-content': HelpCircle,
  'case_studies': Zap,
  'faq-pages': FileQuestion,
  'glossaries': Bookmark,
  
  // Technical Rules
  'https_security': Shield,
  'llms-txt': Bot,
  'xml-sitemap': Map,
  'robots_txt': Search,
  'mobile-optimization': Smartphone,
  'status-code': Activity,
  'structured_data': Code,
  'url-structure': Globe,
  'clean-html-structure': Layout,
};

// Category fallback icons
const CATEGORY_FALLBACK_ICONS = {
  technical: Code,
  content: FileText,
  authority: Shield,
  quality: Search,
};

// Size configurations
const SIZE_CONFIG = {
  sm: {
    icon: 'h-4 w-4',
    container: 'w-8 h-8',
  },
  md: {
    icon: 'h-5 w-5',
    container: 'w-10 h-10',
  },
  lg: {
    icon: 'h-6 w-6',
    container: 'w-12 h-12',
  },
};

export function RuleIcon({ 
  ruleId, 
  category, 
  className = '', 
  showBackground = false,
  size = 'md' 
}: RuleIconProps) {
  // Get the specific icon for this rule, fall back to category icon, then to generic icon
  const IconComponent = RULE_ICON_MAP[ruleId] || CATEGORY_FALLBACK_ICONS[category] || Info;
  
  const sizeConfig = SIZE_CONFIG[size];
  const categoryColor = getDimensionColor(category);
  
  if (showBackground) {
    return (
      <div 
        className={`flex items-center justify-center ${sizeConfig.container} rounded-full ${className}`}
        style={{ 
          backgroundColor: `${categoryColor}15`,
          border: `2px solid ${categoryColor}30`
        }}
      >
        <IconComponent 
          className={sizeConfig.icon}
          style={{ color: categoryColor }}
        />
      </div>
    );
  }
  
  return (
    <IconComponent 
      className={`${sizeConfig.icon} ${className}`}
      style={{ color: categoryColor }}
    />
  );
}

// Export the mapping for potential reuse
export { RULE_ICON_MAP };

// Helper function to check if a rule has a specific icon
export function hasSpecificIcon(ruleId: string): boolean {
  return ruleId in RULE_ICON_MAP;
}

// Helper function to get all available rule IDs
export function getAllRuleIds(): string[] {
  return Object.keys(RULE_ICON_MAP);
}