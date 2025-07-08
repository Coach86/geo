'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Code2,
  Lightbulb,
  Target,
  XCircle,
  ArrowRight,
  FileText,
  Link2,
  Clock,
  Users,
  Globe,
  Tag,
  BarChart,
  Shield,
  BookOpen,
  MessageSquare,
  Play,
  BookMarked,
  ArrowRightLeft,
  Bot,
  Calendar,
  Code,
  Heading,
  Heading1,
  Heading2,
  Image,
  Link,
  Megaphone,
  Search,
  Zap
} from 'lucide-react';

interface OptimizationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  guideType?: string;
  guideName: string;
  severity?: string;
  dimension?: string;
}

const SEVERITY_COLORS = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#10B981',
};

const DIMENSION_COLORS = {
  authority: '#8B5CF6',
  freshness: '#3B82F6',
  structure: '#10B981',
  brand: '#EF4444',
  quality: '#6B7280',
  technical: '#3B82F6',
  content: '#10B981',
};

// Comprehensive guide mappings
const OPTIMIZATION_GUIDES: Record<string, any> = {
  // Quality Dimension Guide
  'Improve Quality Score': {
    dimension: 'quality',
    icon: BarChart,
    overview: 'The Quality dimension is measured by two main rules: Content Freshness (date signals, year mentions, freshness keywords) and In-Depth Guides (word count, structure, TOC, examples). Each rule can score up to 100 points.',
    impact: 'Content Freshness: Up to 100 points across 6 components. In-Depth Guides: Up to 93 points across 10+ components.',
    steps: [
      {
        title: 'Content Freshness (100 points)',
        description: 'Maximize freshness signals across all components.',
        actions: [
          'URL dates: Add /2024/01/ patterns to time-sensitive content (+15)',
          'Metadata: Include datePublished and dateModified (+20)',
          'Content age: Update within 30 days for maximum points (+25)',
          'Visible dates: Display "Published" and "Last updated" dates (+15)',
          'Year mentions: Include 3+ references to current/recent years (+15)',
          'Freshness keywords: Use "latest", "updated", "current" 3+ times (+10)'
        ]
      },
      {
        title: 'In-Depth Guides (93 points)',
        description: 'Create comprehensive guides with all scoring elements.',
        actions: [
          'Word count: Write 3,000+ words for maximum score (+30)',
          'Structure: Use 10+ headings with 3+ H2 sections (+15)',
          'Media: Include 10+ images, videos, or code blocks (+10)',
          'Table of contents: Add navigation menu (+10)',
          'Guide positioning: Use "Ultimate Guide" or "Complete Guide" (+10)',
          'Examples: Include practical examples and case studies (+5)',
          'Links: Add internal and external references (+5)',
          'Industry focus: Target specific industry or use case (+5)'
        ]
      },
      {
        title: 'Quality Optimization Strategy',
        description: 'Prioritize high-impact improvements.',
        actions: [
          'Start with content freshness - easier to implement quickly',
          'Focus on metadata and visible dates for immediate gains',
          'Plan in-depth guides for pillar content topics',
          'Aim for 93/100 on guides by including all elements',
          'Monitor scores after updates to verify improvements'
        ]
      }
    ],
    code: `<!-- Example: Combining Freshness + In-Depth Guide -->
<!-- URL with date for freshness (+15 points) -->
https://example.com/blog/2024/01/ultimate-content-marketing-guide

<article>
  <header>
    <h1>The Ultimate Guide to Content Marketing in 2024</h1>
    <!-- Guide positioning (+10) + Year reference -->
    <div class="meta">
      <time datetime="2024-01-15">Published: January 15, 2024</time>
      <time datetime="2024-01-20">Last Updated: January 20, 2024</time>
      <!-- Visible dates (+15 points) -->
      <span>5,500 words • 25 min read</span>
      <!-- 3000+ words (+30 points) -->
    </div>
  </header>
  
  <!-- Table of Contents (+10 points) -->
  <nav class="toc">
    <h2>Table of Contents</h2>
    <ol>
      <li><a href="#intro">Introduction</a></li>
      <li><a href="#strategy">1. Content Strategy</a></li>
      <li><a href="#creation">2. Content Creation</a></li>
      <li><a href="#distribution">3. Distribution</a></li>
      <!-- 3+ H2 sections for structure points -->
    </ol>
  </nav>
  
  <section id="strategy">
    <h2>1. Content Strategy</h2>
    <p>In 2024, the latest content marketing trends show that updated 
    strategies focusing on current AI tools are essential...</p>
    <!-- Freshness keywords + year mentions -->
    
    <h3>1.1 Practical Example</h3>
    <p>Let's look at how Company X recently improved...</p>
    <!-- Examples (+5 points) -->
    
    <img src="strategy-framework.png" alt="Content strategy framework">
    <video src="tutorial.mp4">Strategy tutorial</video>
    <!-- Media elements (need 10+ for full points) -->
  </section>
</article>

<!-- Metadata for freshness (+20 points) -->
<meta property="article:published_time" content="2024-01-15T08:00:00Z">
<meta property="article:modified_time" content="2024-01-20T10:30:00Z">`,
    bestPractices: [
      'Combine both rules for maximum quality score',
      'Use all 6 freshness components for 100 points',
      'Include all 10+ guide elements for 93 points',
      'Update content monthly to maintain freshness',
      'Track individual component scores for optimization'
    ],
    pitfalls: [
      'Missing date metadata (-20 freshness points)',
      'Content under 1,500 words (guide not scored)',
      'No table of contents (-10 guide points)',
      'Long content without depth (-10 penalty)',
      'Ignoring freshness signals in evergreen content'
    ]
  },
  
  // Overview Guide
  'Optimization Guide Overview': {
    dimension: 'overview',
    icon: BookOpen,
    overview: 'Welcome to the Mint Guide. This comprehensive resource helps you implement improvements across all content dimensions.',
    impact: 'Following these guides can improve overall scores by 30-50%',
    steps: [
      {
        title: 'Understanding Content Dimensions',
        description: 'Learn about the four key dimensions that affect your content performance.',
        actions: [
          'Authority: How trustworthy and credible your content appears',
          'Freshness: How current and regularly updated your content is',
          'Structure: How well-organized and technically optimized your pages are',
          'Brand: How consistently your brand is represented across content'
        ]
      },
      {
        title: 'Prioritizing Improvements',
        description: 'Focus on the areas with the lowest scores first for maximum impact.',
        actions: [
          'Review your dimension scores in the dashboard',
          'Start with critical and high-severity issues',
          'Implement one improvement at a time',
          'Measure the impact before moving to the next'
        ]
      },
      {
        title: 'Available Optimization Guides',
        description: 'Click on any recommendation or issue to see its specific guide.',
        actions: [
          'Authority: Backlinks, author info, citations, domain authority',
          'Freshness: Content updates, publish dates, content calendars',
          'Structure: Heading hierarchy, schema markup, meta tags, page speed',
          'Brand: Brand mentions, consistent messaging, organization schema'
        ]
      }
    ],
    code: `<!-- Example: Basic Page Optimization Checklist -->
1. Technical Foundation
   □ Proper heading hierarchy (one H1, sequential H2-H6)
   □ Meta title and description optimized
   □ Schema markup implemented
   □ Mobile-responsive design

2. Content Quality
   □ Author information visible
   □ Publish/update dates shown
   □ Brand mentioned naturally
   □ Internal/external links included

3. Performance
   □ Images optimized
   □ Core Web Vitals passing
   □ HTTPS enabled
   □ XML sitemap updated`,
    bestPractices: [
      'Track your progress with regular scans',
      'Document what changes you make',
      'Test improvements on a subset first',
      'Share learnings with your team'
    ],
    pitfalls: [
      'Trying to fix everything at once',
      'Ignoring mobile experience',
      'Focusing only on scores, not user value',
      'Not measuring the impact of changes'
    ]
  },
  // Authority Guides
  'Build more high-quality backlinks': {
    dimension: 'authority',
    icon: Link2,
    overview: 'Backlinks from reputable websites signal to search engines and AI models that your content is trustworthy and authoritative.',
    impact: 'Can improve authority score by 20-40 points',
    steps: [
      {
        title: 'Identify Link-Worthy Content',
        description: 'Audit your existing content to find pages with high potential for earning backlinks.',
        actions: [
          'Review your analytics for high-traffic pages',
          'Identify unique data, research, or insights',
          'Create comprehensive guides or resources'
        ]
      },
      {
        title: 'Outreach Strategy',
        description: 'Develop a systematic approach to earning quality backlinks.',
        actions: [
          'Find relevant websites in your industry',
          'Use tools like Ahrefs or SEMrush to analyze competitor backlinks',
          'Create personalized outreach emails',
          'Focus on websites with high domain authority (DA 50+)'
        ]
      },
      {
        title: 'Content Partnerships',
        description: 'Build relationships for ongoing link opportunities.',
        actions: [
          'Guest post on industry publications',
          'Participate in expert roundups',
          'Create shareable infographics or studies',
          'Collaborate with complementary businesses'
        ]
      }
    ],
    code: `<!-- Example of a well-structured link request email -->
Subject: Resource Addition for [Their Article Title]

Hi [Name],

I noticed your excellent article on [topic] at [URL]. 

While researching, I found that you mentioned [specific point]. 
We recently published a comprehensive guide that expands on this: 
[Your URL]

It covers:
- [Unique point 1]
- [Unique point 2]
- [Data/insights they don't have]

Would you consider adding it as a resource for your readers?

Best regards,
[Your name]`,
    bestPractices: [
      'Focus on relevance over quantity',
      'Avoid paid links or link farms',
      'Diversify anchor text naturally',
      'Monitor your backlink profile regularly'
    ],
    pitfalls: [
      'Buying links from low-quality sites',
      'Over-optimized anchor text',
      'Ignoring toxic backlinks',
      'Mass outreach without personalization'
    ]
  },

  'Improve citations': {
    dimension: 'authority',
    icon: Link2,
    overview: 'Citations and references enhance content credibility by showing that your information is backed by authoritative sources.',
    impact: 'Can improve authority score by 15-25 points',
    steps: [
      {
        title: 'Add Relevant Citations',
        description: 'Include citations to authoritative sources throughout your content.',
        actions: [
          'Cite industry research and studies',
          'Reference official documentation',
          'Link to authoritative news sources',
          'Include academic papers when relevant'
        ]
      },
      {
        title: 'Format Citations Properly',
        description: 'Use consistent citation formatting for better recognition.',
        actions: [
          'Use inline citations with source links',
          'Add a references section at the end',
          'Include publication dates for sources',
          'Use schema markup for citations'
        ]
      },
      {
        title: 'Choose Quality Sources',
        description: 'Select high-authority sources for maximum impact.',
        actions: [
          'Prioritize .gov, .edu, and established .org sites',
          'Use recent sources (within 2-3 years)',
          'Verify source credibility and expertise',
          'Avoid broken or outdated links'
        ]
      }
    ],
    code: `<!-- Inline Citation Example -->
<p>According to a recent study by Harvard Business Review<sup><a href="#ref1">[1]</a></sup>, 
companies that implement SEO best practices see a 40% increase in organic traffic.</p>

<!-- Citation Schema Markup -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "citation": [
    {
      "@type": "CreativeWork",
      "name": "SEO Best Practices Study",
      "author": "Harvard Business Review",
      "datePublished": "2024-01-15",
      "url": "https://hbr.org/2024/01/seo-study"
    }
  ]
}
</script>

<!-- References Section -->
<section id="references">
  <h2>References</h2>
  <ol>
    <li id="ref1">
      Harvard Business Review. (2024, January 15). 
      <cite>SEO Best Practices Study</cite>. 
      Retrieved from <a href="https://hbr.org/2024/01/seo-study" rel="nofollow">
      https://hbr.org/2024/01/seo-study</a>
    </li>
  </ol>
</section>`,
    bestPractices: [
      'Cite sources inline where claims are made',
      'Use a consistent citation format',
      'Check all links regularly for validity',
      'Balance citations without overdoing it'
    ],
    pitfalls: [
      'Using low-quality or spam sources',
      'Excessive self-citations',
      'Broken or dead links',
      'Citing outdated information'
    ]
  },

  'Add author information': {
    dimension: 'authority',
    icon: Users,
    overview: 'Author information helps search engines and AI models understand content credibility and expertise.',
    impact: 'Can improve authority score by 10-20 points',
    steps: [
      {
        title: 'Implement Author Schema',
        description: 'Add structured data to identify content authors.',
        actions: [
          'Create author pages with full bios',
          'Include credentials and expertise',
          'Link to author social profiles',
          'Add author images'
        ]
      },
      {
        title: 'Display Author Information',
        description: 'Make author details visible on content pages.',
        actions: [
          'Add author bylines to all articles',
          'Include publication and update dates',
          'Show author expertise badges',
          'Link to author archive pages'
        ]
      }
    ],
    code: `<!-- Author Schema Markup -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "author": {
    "@type": "Person",
    "name": "Jane Smith",
    "description": "Senior SEO Specialist with 10 years experience",
    "url": "https://example.com/authors/jane-smith",
    "image": "https://example.com/images/jane-smith.jpg",
    "sameAs": [
      "https://twitter.com/janesmith",
      "https://linkedin.com/in/janesmith"
    ],
    "jobTitle": "Senior SEO Specialist",
    "worksFor": {
      "@type": "Organization",
      "name": "Your Company"
    }
  },
  "datePublished": "2024-01-15",
  "dateModified": "2024-01-20"
}
</script>

<!-- HTML Display -->
<div class="author-info">
  <img src="/images/jane-smith.jpg" alt="Jane Smith">
  <div>
    <h4>By <a href="/authors/jane-smith">Jane Smith</a></h4>
    <p>Senior SEO Specialist</p>
    <time datetime="2024-01-15">Published Jan 15, 2024</time>
  </div>
</div>`,
    bestPractices: [
      'Use real authors, not generic names',
      'Keep author bios updated',
      'Show relevant credentials',
      'Link to author\'s other content'
    ],
    pitfalls: [
      'Using fake author names',
      'Missing author pages',
      'Inconsistent author information',
      'No social proof or credentials'
    ]
  },

  // Freshness Guides
  'Update outdated content': {
    dimension: 'freshness',
    icon: Clock,
    overview: 'Fresh, updated content signals relevance to both search engines and AI models, improving visibility and trust.',
    impact: 'Can improve freshness score by 30-50 points',
    steps: [
      {
        title: 'Content Audit',
        description: 'Identify content that needs updating.',
        actions: [
          'Find pages older than 12 months',
          'Check for outdated statistics or information',
          'Identify declining traffic pages',
          'Prioritize high-value content'
        ]
      },
      {
        title: 'Update Strategy',
        description: 'Systematically refresh content.',
        actions: [
          'Update statistics and data points',
          'Add new sections for recent developments',
          'Refresh screenshots and examples',
          'Update meta descriptions and titles'
        ]
      },
      {
        title: 'Republishing Process',
        description: 'Properly signal content updates.',
        actions: [
          'Update the modified date in schema',
          'Add an "Updated on" notice',
          'Announce updates on social media',
          'Submit updated sitemap to search engines'
        ]
      }
    ],
    code: `<!-- Updated Content Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "datePublished": "2023-01-15",
  "dateModified": "2024-01-20",
  "headline": "Updated: Complete Guide to SEO in 2024"
}
</script>

<!-- Visible Update Notice -->
<div class="update-notice">
  <Icon name="clock" />
  <p>Last updated: <time datetime="2024-01-20">January 20, 2024</time></p>
  <details>
    <summary>See what's new</summary>
    <ul>
      <li>Added section on AI search optimization</li>
      <li>Updated statistics for 2024</li>
      <li>New case studies added</li>
    </ul>
  </details>
</div>`,
    bestPractices: [
      'Update quarterly for competitive topics',
      'Keep original URL when possible',
      'Document what was updated',
      'Maintain content history'
    ],
    pitfalls: [
      'Changing dates without real updates',
      'Breaking existing URLs',
      'Removing valuable historical content',
      'Forgetting to update internal links'
    ]
  },

  'Add publish/update dates': {
    dimension: 'freshness',
    icon: Clock,
    overview: 'Clear date information helps search engines and users understand content freshness.',
    impact: 'Can improve freshness score by 10-15 points',
    steps: [
      {
        title: 'Add Date Schema',
        description: 'Implement proper date markup.',
        actions: [
          'Add datePublished to all content',
          'Include dateModified when updated',
          'Use ISO 8601 date format',
          'Make dates visible to users'
        ]
      }
    ],
    code: `<!-- Article with Dates -->
<article>
  <header>
    <h1>Your Article Title</h1>
    <div class="meta">
      <time datetime="2024-01-15" itemprop="datePublished">
        Published: January 15, 2024
      </time>
      <time datetime="2024-01-20" itemprop="dateModified">
        Updated: January 20, 2024
      </time>
    </div>
  </header>
  <!-- content -->
</article>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "datePublished": "2024-01-15T08:00:00-08:00",
  "dateModified": "2024-01-20T10:30:00-08:00"
}
</script>`,
    bestPractices: [
      'Always use ISO 8601 format in schema',
      'Display dates prominently',
      'Update dateModified for significant changes',
      'Include timezone information'
    ],
    pitfalls: [
      'Hidden or unclear dates',
      'Wrong date formats',
      'Not updating dateModified',
      'Fake or misleading dates'
    ]
  },

  // Structure Guides
  'Fix heading hierarchy': {
    dimension: 'structure',
    icon: FileText,
    overview: 'Proper heading structure helps search engines and AI understand content organization and importance.',
    impact: 'Can improve structure score by 15-25 points',
    steps: [
      {
        title: 'Audit Current Structure',
        description: 'Identify heading hierarchy issues.',
        actions: [
          'Check for multiple H1 tags',
          'Find skipped heading levels',
          'Identify missing headings',
          'Review heading relevance'
        ]
      },
      {
        title: 'Implement Proper Hierarchy',
        description: 'Create logical heading structure.',
        actions: [
          'Use only one H1 per page',
          'Follow sequential order (H1→H2→H3)',
          'Make headings descriptive',
          'Include keywords naturally'
        ]
      }
    ],
    code: `<!-- Correct Heading Structure -->
<article>
  <h1>Main Page Title - Only One H1</h1>
  
  <h2>Major Section 1</h2>
  <p>Content...</p>
  
  <h3>Subsection 1.1</h3>
  <p>Content...</p>
  
  <h3>Subsection 1.2</h3>
  <p>Content...</p>
  
  <h2>Major Section 2</h2>
  <p>Content...</p>
  
  <h3>Subsection 2.1</h3>
  <p>Content...</p>
  
  <!-- Never skip levels like H1→H3 -->
</article>

<!-- CSS for Visual Hierarchy -->
<style>
  h1 { font-size: 2.5em; margin-bottom: 0.5em; }
  h2 { font-size: 2em; margin-bottom: 0.4em; }
  h3 { font-size: 1.5em; margin-bottom: 0.3em; }
</style>`,
    bestPractices: [
      'One H1 per page matching title tag',
      'Use headings to outline content',
      'Keep headings concise and descriptive',
      'Include target keywords naturally'
    ],
    pitfalls: [
      'Multiple H1 tags',
      'Skipping heading levels',
      'Using headings for styling only',
      'Keyword stuffing in headings'
    ]
  },

  'Add schema markup': {
    dimension: 'structure',
    icon: Code2,
    overview: 'Schema markup helps search engines and AI better understand your content context and relationships.',
    impact: 'Can improve structure score by 20-30 points',
    steps: [
      {
        title: 'Choose Appropriate Schema',
        description: 'Select the right schema type for your content.',
        actions: [
          'Article for blog posts',
          'Product for e-commerce',
          'LocalBusiness for companies',
          'FAQ for question pages'
        ]
      },
      {
        title: 'Implement Schema Markup',
        description: 'Add structured data to your pages.',
        actions: [
          'Use JSON-LD format (recommended)',
          'Validate with Schema.org validator',
          'Test with Google Rich Results Test',
          'Monitor in Search Console'
        ]
      }
    ],
    code: `<!-- Article Schema Example -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Your Article Title",
  "description": "Brief description of the article",
  "image": "https://example.com/image.jpg",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Your Company",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "datePublished": "2024-01-15",
  "dateModified": "2024-01-20",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/article-url"
  }
}
</script>

<!-- Product Schema Example -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://example.com/product.jpg",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "price": "99.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "89"
  }
}
</script>`,
    bestPractices: [
      'Use Google\'s Structured Data Guidelines',
      'Keep schema updated with content',
      'Use multiple schema types when relevant',
      'Test before deploying'
    ],
    pitfalls: [
      'Marking up hidden content',
      'Using incorrect schema types',
      'Incomplete required properties',
      'Not validating markup'
    ]
  },

  'Improve meta tags': {
    dimension: 'structure',
    icon: Tag,
    overview: 'Well-optimized meta tags improve click-through rates and help search engines understand page content.',
    impact: 'Can improve structure score by 10-20 points',
    steps: [
      {
        title: 'Optimize Title Tags',
        description: 'Create compelling, keyword-rich titles.',
        actions: [
          'Keep under 60 characters',
          'Include primary keyword near beginning',
          'Make each title unique',
          'Add brand name at end'
        ]
      },
      {
        title: 'Write Meta Descriptions',
        description: 'Craft descriptions that drive clicks.',
        actions: [
          'Keep under 155 characters',
          'Include call-to-action',
          'Use target keywords naturally',
          'Make them unique and compelling'
        ]
      }
    ],
    code: `<!-- Optimized Meta Tags -->
<head>
  <!-- Title: Primary Keyword | Secondary Keyword - Brand -->
  <title>SEO Guide 2024 | Search Optimization Tips - YourBrand</title>
  
  <!-- Description: Compelling, includes keywords, CTA -->
  <meta name="description" content="Master SEO in 2024 with our comprehensive guide. Learn proven optimization strategies, technical tips, and AI search tactics. Start improving rankings today!">
  
  <!-- Open Graph for Social -->
  <meta property="og:title" content="SEO Guide 2024 | Search Optimization Tips">
  <meta property="og:description" content="Master SEO in 2024 with our comprehensive guide. Learn proven strategies.">
  <meta property="og:image" content="https://example.com/seo-guide.jpg">
  <meta property="og:type" content="article">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="SEO Guide 2024">
  <meta name="twitter:description" content="Master SEO in 2024 with proven strategies.">
  
  <!-- Additional Important Meta -->
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://example.com/seo-guide">
</head>`,
    bestPractices: [
      'Write for humans, optimize for search',
      'Include emotional triggers',
      'Use power words when appropriate',
      'A/B test different versions'
    ],
    pitfalls: [
      'Duplicate titles/descriptions',
      'Keyword stuffing',
      'Generic descriptions',
      'Ignoring character limits'
    ]
  },

  // AEO Content Rules
  'glossaries': {
    dimension: 'content',
    icon: BookOpen,
    overview: 'Glossaries help AI models understand domain-specific terminology and provide comprehensive definitions for complex topics.',
    impact: 'Can improve content comprehension by 25-40 points',
    steps: [
      {
        title: 'Identify Key Terms',
        description: 'Catalog industry-specific terminology that needs definition.',
        actions: [
          'List technical terms, jargon, and acronyms used',
          'Identify terms that competitors define well',
          'Survey customer questions about terminology',
          'Review support tickets for confused terms'
        ]
      },
      {
        title: 'Create Comprehensive Definitions',
        description: 'Write clear, accurate definitions for each term.',
        actions: [
          'Provide 2-3 sentence definitions',
          'Include examples and use cases',
          'Add related terms and cross-references',
          'Use simple language to explain complex concepts'
        ]
      },
      {
        title: 'Implement Structured Glossary',
        description: 'Organize glossary with proper formatting and navigation.',
        actions: [
          'Alphabetize terms for easy navigation',
          'Add search functionality',
          'Include internal links to relevant content',
          'Implement schema markup for definitions'
        ]
      }
    ],
    code: `<!-- Glossary Schema Markup -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  "name": "Industry Glossary",
  "hasDefinedTerm": [
    {
      "@type": "DefinedTerm",
      "name": "API",
      "description": "Application Programming Interface - a set of protocols and tools for building software applications",
      "inDefinedTermSet": "https://example.com/glossary"
    }
  ]
}
</script>

<!-- HTML Structure -->
<div class="glossary">
  <h2>Glossary</h2>
  <dl class="glossary-terms">
    <dt id="api">API</dt>
    <dd>Application Programming Interface - a set of protocols and tools for building software applications. APIs allow different software components to communicate with each other.</dd>
  </dl>
</div>`,
    bestPractices: [
      'Keep definitions concise but complete',
      'Update glossary regularly with new terms',
      'Link glossary terms throughout content',
      'Include pronunciation for difficult terms'
    ],
    pitfalls: [
      'Using circular definitions',
      'Making definitions too technical',
      'Forgetting to update outdated definitions',
      'Not linking terms to main content'
    ]
  },

  'concise_answers': {
    dimension: 'content',
    icon: MessageSquare,
    overview: 'Concise answers provide direct, actionable responses to user queries, improving AI model understanding and user satisfaction.',
    impact: 'Can improve answer relevance by 30-50 points',
    steps: [
      {
        title: 'Identify Common Questions',
        description: 'Research the most frequent questions in your domain.',
        actions: [
          'Analyze search queries and customer support data',
          'Review competitor FAQ sections',
          'Use tools like AnswerThePublic or AlsoAsked',
          'Survey your audience directly'
        ]
      },
      {
        title: 'Structure Clear Answers',
        description: 'Format answers for quick comprehension.',
        actions: [
          'Start with a direct answer in 1-2 sentences',
          'Follow with supporting details',
          'Use bullet points for multiple steps',
          'Include relevant examples or scenarios'
        ]
      },
      {
        title: 'Optimize for Featured Snippets',
        description: 'Format content to appear in search result snippets.',
        actions: [
          'Use question headings (H2/H3)',
          'Provide answers in 40-60 words',
          'Include numbered lists for processes',
          'Add FAQ schema markup'
        ]
      }
    ],
    code: `<!-- FAQ Schema Markup -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How long does shipping take?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days."
      }
    }
  ]
}
</script>

<!-- HTML Structure -->
<section class="faq">
  <h2>How long does shipping take?</h2>
  <p><strong>Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days.</strong></p>
  <p>Orders placed before 2 PM EST ship the same day. Weekend orders ship on Monday.</p>
</section>`,
    bestPractices: [
      'Lead with the most direct answer',
      'Keep initial response under 60 words',
      'Use natural language, not jargon',
      'Update answers based on user feedback'
    ],
    pitfalls: [
      'Being too verbose in initial answer',
      'Using technical language unnecessarily',
      'Not addressing the actual question asked',
      'Forgetting to update outdated information'
    ]
  },

  'multimodal_content': {
    dimension: 'structure',
    icon: Play,
    overview: 'Multimodal content combines text, images, videos, and interactive elements to enhance user engagement and AI understanding.',
    impact: 'Can improve engagement scores by 40-60 points',
    steps: [
      {
        title: 'Content Audit',
        description: 'Assess current content for multimedia opportunities.',
        actions: [
          'Identify text-heavy sections that need visuals',
          'Find complex concepts that need diagrams',
          'Look for processes that benefit from video',
          'Evaluate user engagement on existing multimedia'
        ]
      },
      {
        title: 'Create Diverse Media',
        description: 'Add various types of multimedia content.',
        actions: [
          'Add relevant images with descriptive alt text',
          'Create explainer videos for complex topics',
          'Include infographics for data visualization',
          'Add interactive elements like calculators or quizzes'
        ]
      },
      {
        title: 'Optimize Media Performance',
        description: 'Ensure multimedia loads quickly and accessibly.',
        actions: [
          'Implement lazy loading for images',
          'Use responsive images with srcset',
          'Add captions and transcripts for videos',
          'Optimize file sizes without quality loss'
        ]
      }
    ],
    code: `<!-- Responsive Image with Lazy Loading -->
<figure>
  <img 
    src="small-image.jpg"
    srcset="small-image.jpg 480w, medium-image.jpg 800w, large-image.jpg 1200w"
    sizes="(max-width: 480px) 100vw, (max-width: 800px) 50vw, 25vw"
    alt="Detailed description of the image content"
    loading="lazy"
  >
  <figcaption>Clear caption explaining the image</figcaption>
</figure>

<!-- Video with Accessibility -->
<video controls preload="metadata">
  <source src="video.mp4" type="video/mp4">
  <track kind="subtitles" src="subtitles.vtt" srclang="en" label="English">
  <p>Your browser doesn't support videos. <a href="video.mp4">Download the video</a>.</p>
</video>`,
    bestPractices: [
      'Always include descriptive alt text',
      'Use captions and transcripts for accessibility',
      'Optimize images for different screen sizes',
      'Test loading performance on mobile'
    ],
    pitfalls: [
      'Using images without alt text',
      'Not optimizing file sizes',
      'Forgetting mobile responsiveness',
      'Missing video transcripts'
    ]
  },

  'image_alt': {
    dimension: 'structure',
    icon: Image,
    overview: 'Descriptive alt text helps screen readers and AI models understand image content, improving accessibility and SEO.',
    impact: 'Can improve accessibility and structure scores by 20-30 points',
    steps: [
      {
        title: 'Audit Existing Images',
        description: 'Review all images for missing or poor alt text.',
        actions: [
          'Use accessibility tools to find missing alt text',
          'Review existing alt text for quality',
          'Prioritize images that convey important information',
          'Identify decorative vs. informational images'
        ]
      },
      {
        title: 'Write Descriptive Alt Text',
        description: 'Create meaningful descriptions for each image.',
        actions: [
          'Describe what you see in the image',
          'Include relevant context and purpose',
          'Keep descriptions concise but informative',
          'Avoid redundant phrases like "image of" or "picture of"'
        ]
      }
    ],
    code: `<!-- Good Alt Text Examples -->
<img src="chart.png" alt="Sales increased 40% from Q1 to Q2 2024, rising from $10K to $14K">

<img src="team-photo.jpg" alt="Five team members collaborating around a whiteboard">

<img src="product-demo.gif" alt="User clicking through mobile app checkout process">

<!-- Decorative Images -->
<img src="decorative-border.png" alt="" role="presentation">

<!-- Complex Images with Extended Description -->
<img src="complex-chart.png" alt="Revenue breakdown by product category" 
     aria-describedby="chart-description">
<div id="chart-description">
  Software sales: 45%, Hardware: 30%, Services: 25%
</div>`,
    bestPractices: [
      'Be specific and concise (under 125 characters)',
      'Include important text that appears in images',
      'Describe the image\'s purpose, not just appearance',
      'Use empty alt="" for purely decorative images'
    ],
    pitfalls: [
      'Using generic descriptions like "image"',
      'Being too verbose or too brief',
      'Forgetting alt text entirely',
      'Adding alt text to decorative images'
    ]
  },

  'in_depth_guides': {
    dimension: 'quality',
    icon: BookMarked,
    overview: 'In-depth guides are scored based on word count, structure, media elements, and semantic analysis including table of contents, guide positioning, examples, and topic coverage.',
    impact: 'Can achieve up to 93/100 points: Word count (30), Structure (15), Media (10), TOC (10), Guide type (10), Examples (5), Links (5), Entity coverage (5), Industry focus (5)',
    steps: [
      {
        title: 'Meet Length Requirements',
        description: 'Create comprehensive content with sufficient word count.',
        actions: [
          'Write 3,000+ words for maximum points (30 points)',
          'Ensure at least 2,000 words for good score (20 points)',
          'Never go below 1,500 words (minimum threshold)',
          'Focus on depth, not just length - avoid penalties for shallow content'
        ]
      },
      {
        title: 'Structure Your Guide',
        description: 'Organize content with clear hierarchy and navigation.',
        actions: [
          'Include 10+ headings with at least 3 H2 sections (15 points)',
          'Add a table of contents or navigation menu (10 points)',
          'Use clear section divisions with H2 and H3 tags',
          'Position as "Ultimate Guide" or "Complete Guide" in title/URL (10 points)'
        ]
      },
      {
        title: 'Add Rich Content Elements',
        description: 'Enhance guide with multimedia and practical elements.',
        actions: [
          'Include 10+ media elements: images, videos, code blocks (10 points)',
          'Add practical examples and case studies (5 points)',
          'Link to related internal content (3-5 points)',
          'Include external references to authoritative sources',
          'Focus on specific industry or use case (5 points)'
        ]
      }
    ],
    code: `<!-- URL should indicate guide content (+5 points) -->
https://example.com/ultimate-guide-to-seo-optimization

<!-- Guide Structure Example (93/100 score) -->
<article class="guide">
  <header>
    <h1>The Ultimate Guide to SEO Optimization in 2024</h1>
    <!-- "Ultimate Guide" positioning = +10 points -->
    <p class="guide-meta">5,336 words • 25 min read • Industry: Digital Marketing</p>
  </header>
  
  <!-- Table of Contents (+10 points) -->
  <nav class="table-of-contents">
    <h2>Table of Contents</h2>
    <ol>
      <li><a href="#introduction">Introduction</a></li>
      <li><a href="#keyword-research">1. Keyword Research</a></li>
      <li><a href="#on-page-seo">2. On-Page SEO</a></li>
      <!-- Need 3+ H2 sections for structure points -->
    </ol>
  </nav>
  
  <!-- Main Content (3,000+ words = +30 points) -->
  <section id="keyword-research">
    <h2>1. Keyword Research</h2> <!-- H2 sections -->
    
    <h3>1.1 Understanding Search Intent</h3> <!-- H3 subsections -->
    <p>Let's look at a practical example...</p>
    <!-- Practical examples = +5 points -->
    
    <img src="keyword-research-tool.png" alt="Keyword research tool interface">
    <video src="tutorial.mp4">Tutorial video</video>
    <!-- 10+ media elements = +10 points -->
    
    <p>For more details, see our <a href="/seo-tools">SEO tools guide</a>.</p>
    <!-- Internal links = +3 points -->
    
    <p>According to <a href="https://moz.com/research">Moz research</a>...</p>
    <!-- External references = +2 points -->
  </section>
  
  <!-- Industry Focus Example (+5 points) -->
  <section id="ecommerce-seo">
    <h2>4. SEO for E-commerce Sites</h2>
    <p>Specific strategies for online retail...</p>
  </section>
</article>`,
    bestPractices: [
      'Aim for 93/100 score with 3000+ words and all elements',
      'Position content as "Ultimate" or "Complete" guide',
      'Include table of contents for easy navigation',
      'Maintain 75%+ entity coverage for topics',
      'Add industry-specific sections for focus points'
    ],
    pitfalls: [
      'Writing below 1,500 words (automatic low score)',
      'Long content without depth (-10 penalty)',
      'No table of contents (-10 points)',
      'Low entity coverage under 25% (-10 penalty)',
      'Missing practical examples (-5 points)'
    ]
  },

  'comparison_content': {
    dimension: 'authority',
    icon: ArrowRightLeft,
    overview: 'Comparison content helps users make informed decisions by presenting balanced analysis of different options.',
    impact: 'Can improve authority and user value scores by 25-40 points',
    steps: [
      {
        title: 'Identify Comparison Opportunities',
        description: 'Find products, services, or concepts that users compare.',
        actions: [
          'Research "vs" keywords in your industry',
          'Analyze customer decision-making processes',
          'Review competitor comparison pages',
          'Survey customers about their evaluation criteria'
        ]
      },
      {
        title: 'Create Balanced Comparisons',
        description: 'Develop fair, comprehensive comparison content.',
        actions: [
          'Include pros and cons for each option',
          'Use consistent evaluation criteria',
          'Provide use case recommendations',
          'Include pricing and feature comparisons'
        ]
      },
      {
        title: 'Structure for Easy Scanning',
        description: 'Format comparisons for quick comprehension.',
        actions: [
          'Use comparison tables with clear headers',
          'Implement side-by-side layouts',
          'Add visual indicators for advantages',
          'Include summary recommendations'
        ]
      }
    ],
    code: `<!-- Comparison Table Structure -->
<table class="comparison-table">
  <thead>
    <tr>
      <th>Feature</th>
      <th>Option A</th>
      <th>Option B</th>
      <th>Option C</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Price</td>
      <td>$29/month</td>
      <td>$49/month</td>
      <td>$79/month</td>
    </tr>
    <tr>
      <td>Features</td>
      <td>Basic</td>
      <td>Advanced</td>
      <td>Enterprise</td>
    </tr>
  </tbody>
</table>

<!-- Comparison Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Product Comparison",
  "itemListElement": [
    {
      "@type": "Product",
      "position": 1,
      "name": "Option A",
      "offers": {
        "@type": "Offer",
        "price": "29",
        "priceCurrency": "USD"
      }
    }
  ]
}
</script>`,
    bestPractices: [
      'Remain objective and balanced',
      'Include real-world use cases',
      'Update comparisons when products change',
      'Provide clear recommendations'
    ],
    pitfalls: [
      'Being biased toward one option',
      'Not updating outdated comparisons',
      'Missing important comparison criteria',
      'Making tables too complex to read'
    ]
  },

  'subheadings': {
    dimension: 'structure',
    icon: Heading2,
    overview: 'Well-structured subheadings improve content scannability and help AI models understand content hierarchy.',
    impact: 'Can improve structure and readability scores by 20-35 points',
    steps: [
      {
        title: 'Plan Heading Structure',
        description: 'Create a logical hierarchy for your content.',
        actions: [
          'Start with one H1 tag for the main title',
          'Use H2 for major sections',
          'Use H3 for subsections under H2',
          'Never skip heading levels (e.g., H1 to H3)'
        ]
      },
      {
        title: 'Write Descriptive Headings',
        description: 'Make headings clear and informative.',
        actions: [
          'Include relevant keywords naturally',
          'Keep headings concise but descriptive',
          'Use parallel structure for related sections',
          'Make headings scannable and meaningful'
        ]
      }
    ],
    code: `<!-- Proper Heading Hierarchy -->
<article>
  <h1>Complete Guide to Content Marketing</h1>
  
  <h2>Content Strategy</h2>
  <p>Overview of content strategy...</p>
  
    <h3>Defining Your Audience</h3>
    <p>How to identify your target audience...</p>
    
    <h3>Content Planning</h3>
    <p>Creating a content calendar...</p>
  
  <h2>Content Creation</h2>
  <p>Best practices for creating content...</p>
  
    <h3>Writing Techniques</h3>
    <p>Effective writing strategies...</p>
    
    <h3>Visual Content</h3>
    <p>Adding images and videos...</p>
</article>`,
    bestPractices: [
      'Use only one H1 per page',
      'Make headings descriptive and specific',
      'Include keywords naturally in headings',
      'Maintain consistent heading style'
    ],
    pitfalls: [
      'Using multiple H1 tags',
      'Skipping heading levels',
      'Making headings too generic',
      'Using headings for styling only'
    ]
  },

  'content_freshness': {
    dimension: 'quality',
    icon: Calendar,
    overview: 'Content freshness is measured by date metadata, visible dates, recent year references, and freshness indicators. The rule checks URL dates, structured metadata, visible date mentions, current year references, and freshness keywords.',
    impact: 'Can improve quality scores by up to 100 points (URL: 15, Metadata: 20, Age: 25, Visible Dates: 15, Years: 15, Indicators: 10)',
    steps: [
      {
        title: 'Add Date Metadata and URLs',
        description: 'Implement structured date information that AI can understand.',
        actions: [
          'Add date patterns to URLs for time-sensitive content (/2024/01/ or /2024-01-15)',
          'Include datePublished and dateModified in meta tags or JSON-LD',
          'Use ISO 8601 date format (2024-01-15T08:00:00Z)',
          'Ensure dates are machine-readable and consistent'
        ]
      },
      {
        title: 'Display Visible Dates',
        description: 'Make dates visible in your content for users and AI.',
        actions: [
          'Show "Published on: [date]" or "Last updated: [date]" prominently',
          'Use consistent date formats (January 15, 2024 or 01/15/2024)',
          'Place dates near the top of content',
          'Ensure visible dates match metadata dates'
        ]
      },
      {
        title: 'Include Freshness Signals',
        description: 'Add current year references and freshness indicators.',
        actions: [
          'Mention current year (2024) or recent years (2023, 2022) naturally in content',
          'Use freshness keywords: "latest", "updated", "current", "recent", "new"',
          'Include phrases like "as of January 2024" or "this year"',
          'Update content to maintain at least 3 year references and 3 freshness indicators'
        ]
      }
    ],
    code: `<!-- URL with Date Pattern (worth 15 points) -->
https://example.com/blog/2024/01/content-marketing-guide

<!-- Date Metadata (worth 20 points for presence + up to 25 for recency) -->
<meta property="article:published_time" content="2024-01-15T08:00:00Z">
<meta property="article:modified_time" content="2024-01-20T10:30:00Z">

<!-- JSON-LD Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "datePublished": "2024-01-15T08:00:00Z",
  "dateModified": "2024-01-20T10:30:00Z"
}
</script>

<!-- Visible Dates (worth 15 points) -->
<article>
  <div class="article-meta">
    <time datetime="2024-01-15">Published on: January 15, 2024</time>
    <time datetime="2024-01-20">Last updated: January 20, 2024</time>
  </div>
  
  <!-- Content with Year References (worth up to 15 points) -->
  <p>In 2024, content marketing has evolved significantly. As of January 2024, 
  the latest trends show... Based on 2023 data, we've seen...</p>
  
  <!-- Freshness Indicators (worth up to 10 points) -->
  <p>This updated guide covers the latest strategies. Recently revised to include 
  current best practices and new techniques just released this year.</p>
</article>`,
    bestPractices: [
      'Update content within 30 days for maximum age points (25)',
      'Include both datePublished and dateModified metadata',
      'Match visible dates with metadata dates exactly',
      'Use at least 3 recent year mentions and 3 freshness keywords'
    ],
    pitfalls: [
      'Missing structured date metadata (loses 20 points)',
      'Content older than 1 year (loses all 25 age points)',
      'No visible dates in content (loses 15 points)',
      'Using outdated year references or no freshness indicators'
    ]
  },

  'main_heading': {
    dimension: 'structure',
    icon: Heading1,
    overview: 'Main heading (H1) scoring is based on: having exactly one H1 (40 points), optimal length of 3-10 words (20 points), descriptiveness with 20+ characters (20 points), non-generic text (10 points), and relationship to title tag (10 points).',
    impact: 'Can achieve up to 100 points across 5 components. Having no H1 results in 0 points, multiple H1s cap at 10 points.',
    steps: [
      {
        title: 'Use Exactly One H1 Tag',
        description: 'Having exactly one H1 is worth 40 base points.',
        actions: [
          'Ensure exactly one H1 tag exists on the page (40 points)',
          'Remove any duplicate H1 tags (multiple H1s = max 10 points)',
          'Never have zero H1 tags (0 points total)',
          'Place H1 prominently at the top of main content'
        ]
      },
      {
        title: 'Optimize H1 Length and Content',
        description: 'Length and quality add up to 50 additional points.',
        actions: [
          'Keep H1 between 3-10 words for optimal length (20 points)',
          'Make H1 descriptive with 20+ characters (20 points)',
          'Avoid generic text like "Home", "Welcome", "Page 1" (10 points)',
          'Use specific, meaningful text that describes the page'
        ]
      },
      {
        title: 'Relate H1 to Title Tag',
        description: 'H1 should relate to but not exactly match the title.',
        actions: [
          'Include some common keywords between H1 and title (10 points)',
          'Make H1 unique - not an exact copy of title tag',
          'Ensure H1 and title are topically related',
          'Avoid completely unrelated H1 and title text'
        ]
      }
    ],
    code: `<!-- Perfect Score H1 Example (100/100) -->
<head>
  <title>Email Marketing Guide 2024 - Strategies, Tools & Best Practices</title>
</head>
<body>
  <!-- Exactly one H1 (+40 points) -->
  <!-- 7 words - optimal length (+20 points) -->
  <!-- 42 characters - descriptive (+20 points) -->
  <!-- Not generic text (+10 points) -->
  <!-- Relates to title but unique (+10 points) -->
  <h1>Complete Guide to Email Marketing Success</h1>

<!-- Scoring Breakdown Examples -->

<!-- 60/100: One H1, optimal length, but generic -->
<h1>Email Marketing Guide</h1>
<!-- Only 3 words and 21 characters -->

<!-- 50/100: One H1 but too short -->
<h1>Email Guide</h1>
<!-- Only 2 words (needs 3-10) -->

<!-- 10/100: Multiple H1 tags (critical error) -->
<h1>Email Marketing</h1>
<h1>Our Services</h1>
<h1>Contact Us</h1>

<!-- 0/100: No H1 tag at all -->
<h2>Email Marketing Guide</h2>

<!-- Bad: Generic text loses 10 points -->
<h1>Welcome</h1>
<h1>Home</h1>
<h1>Page 1</h1>`,
    bestPractices: [
      'Always use exactly one H1 tag (40 points)',
      'Keep H1 between 3-10 words (20 points)',
      'Make H1 20+ characters for descriptiveness (20 points)',
      'Avoid generic text patterns (10 points)',
      'Relate to title without exact matching (10 points)'
    ],
    pitfalls: [
      'No H1 tag = automatic 0 score',
      'Multiple H1 tags = maximum 10 points',
      'H1 under 3 words loses length points',
      'Generic text like "Welcome" loses 10 points',
      'Exact title match loses relationship points'
    ]
  },

  'case_studies': {
    dimension: 'authority',
    icon: Zap,
    overview: 'Case studies demonstrate real-world application of your expertise, building trust and authority with both users and AI models.',
    impact: 'Can improve authority and trust scores by 30-45 points',
    steps: [
      {
        title: 'Select Compelling Cases',
        description: 'Choose case studies that showcase your best work.',
        actions: [
          'Identify successful client projects',
          'Choose diverse industries and use cases',
          'Get client permission for detailed sharing',
          'Focus on measurable results and outcomes'
        ]
      },
      {
        title: 'Structure Case Studies',
        description: 'Follow a clear, logical format.',
        actions: [
          'Start with client background and challenge',
          'Explain your approach and methodology',
          'Present results with specific metrics',
          'Include client testimonials or quotes'
        ]
      },
      {
        title: 'Make Results Tangible',
        description: 'Use specific data and metrics.',
        actions: [
          'Include before/after comparisons',
          'Use charts and graphs for data visualization',
          'Provide percentage improvements',
          'Show timeframes for achieving results'
        ]
      }
    ],
    code: `<!-- Case Study Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How Company X Increased Sales by 150%",
  "description": "Case study showing SEO strategy implementation",
  "author": {
    "@type": "Organization",
    "name": "Your Company"
  },
  "about": {
    "@type": "Organization",
    "name": "Client Company"
  }
}
</script>

<!-- Case Study Structure -->
<article class="case-study">
  <header>
    <h1>How TechCorp Increased Leads by 300% in 6 Months</h1>
    <div class="case-meta">
      <span>Industry: Technology</span>
      <span>Timeline: 6 months</span>
      <span>Budget: $50,000</span>
    </div>
  </header>
  
  <section class="challenge">
    <h2>The Challenge</h2>
    <p>TechCorp was struggling with low online visibility...</p>
  </section>
  
  <section class="solution">
    <h2>Our Solution</h2>
    <p>We implemented a comprehensive SEO strategy...</p>
  </section>
  
  <section class="results">
    <h2>Results</h2>
    <div class="metrics">
      <div class="metric">
        <span class="number">300%</span>
        <span class="label">Increase in Leads</span>
      </div>
    </div>
  </section>
</article>`,
    bestPractices: [
      'Use real data and specific metrics',
      'Include client testimonials',
      'Show before/after comparisons',
      'Update case studies regularly'
    ],
    pitfalls: [
      'Making claims without evidence',
      'Being too vague about results',
      'Not getting client permission',
      'Focusing only on positive outcomes'
    ]
  },

  'citing_sources': {
    dimension: 'authority',
    icon: Link,
    overview: 'Proper source citation builds credibility and helps AI models verify information accuracy.',
    impact: 'Can improve authority and trust scores by 20-30 points',
    steps: [
      {
        title: 'Identify Citation Opportunities',
        description: 'Find claims that need supporting evidence.',
        actions: [
          'Mark statistical claims and data points',
          'Identify expert opinions and quotes',
          'Note industry studies and research',
          'Find areas where readers might question claims'
        ]
      },
      {
        title: 'Choose Quality Sources',
        description: 'Select authoritative, credible sources.',
        actions: [
          'Prefer .gov, .edu, and established .org sites',
          'Use recent sources (within 2-3 years)',
          'Check source reputation and authority',
          'Verify information accuracy'
        ]
      },
      {
        title: 'Format Citations Properly',
        description: 'Use consistent citation formatting.',
        actions: [
          'Include inline citations with links',
          'Add publication dates',
          'Create a references section',
          'Use proper citation schema markup'
        ]
      }
    ],
    code: `<!-- Inline Citation -->
<p>According to recent research by Stanford University<sup><a href="#ref1">[1]</a></sup>, 
companies using AI see 40% productivity gains.</p>

<!-- Citation Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "citation": [
    {
      "@type": "CreativeWork",
      "name": "AI Productivity Study 2024",
      "author": "Stanford University",
      "datePublished": "2024-01-15",
      "url": "https://stanford.edu/study-2024"
    }
  ]
}
</script>

<!-- References Section -->
<section id="references">
  <h2>References</h2>
  <ol>
    <li id="ref1">
      Stanford University. (2024, January 15). 
      <cite>AI Productivity Study 2024</cite>. 
      Retrieved from <a href="https://stanford.edu/study-2024">
      https://stanford.edu/study-2024</a>
    </li>
  </ol>
</section>`,
    bestPractices: [
      'Cite sources for all factual claims',
      'Use authoritative, recent sources',
      'Check links regularly for validity',
      'Provide proper attribution'
    ],
    pitfalls: [
      'Using unreliable sources',
      'Not updating broken links',
      'Over-citing common knowledge',
      'Missing publication dates'
    ]
  },

  // Authority Rules
  'press-release-distribution': {
    dimension: 'authority',
    icon: Megaphone,
    overview: 'Strategic press release distribution builds brand awareness and generates authoritative backlinks.',
    impact: 'Can improve authority and brand visibility by 25-40 points',
    steps: [
      {
        title: 'Create Newsworthy Content',
        description: 'Develop press releases that media will want to cover.',
        actions: [
          'Announce significant company milestones',
          'Share industry research or studies',
          'Launch new products or services',
          'Partner with other companies or organizations'
        ]
      },
      {
        title: 'Target Relevant Media',
        description: 'Identify journalists and publications in your industry.',
        actions: [
          'Research industry publications and reporters',
          'Build relationships with relevant journalists',
          'Use press release distribution services',
          'Target local media for location-based news'
        ]
      }
    ],
    code: `<!-- Press Release Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "Company X Launches Revolutionary AI Platform",
  "datePublished": "2024-01-15",
  "publisher": {
    "@type": "Organization",
    "name": "Your Company"
  },
  "author": {
    "@type": "Person",
    "name": "PR Contact Name"
  }
}
</script>`,
    bestPractices: [
      'Include multimedia elements',
      'Follow standard press release format',
      'Distribute through reputable services',
      'Follow up with journalists personally'
    ],
    pitfalls: [
      'Making announcements that aren\'t newsworthy',
      'Using overly promotional language',
      'Not following up on distribution',
      'Poor timing of releases'
    ]
  },

  // Technical Rules
  'llms_txt': {
    dimension: 'technical',
    icon: Bot,
    overview: 'The llms.txt file helps AI crawlers understand your site structure and content preferences.',
    impact: 'Can improve AI discovery and indexing by 20-35 points',
    steps: [
      {
        title: 'Create llms.txt File',
        description: 'Set up the AI crawler instruction file.',
        actions: [
          'Create llms.txt in your site root directory',
          'Specify important pages and content',
          'Include crawling preferences',
          'Add contact information for AI services'
        ]
      }
    ],
    code: `# llms.txt - AI Crawler Instructions
# Place this file at https://yoursite.com/llms.txt

# About this site
Site-name: Your Company Name
Description: Brief description of your business and content
Contact: ai-contact@yourcompany.com

# Important pages for AI training
Important-pages:
/about
/services
/blog
/documentation

# Content preferences
Content-type: Business website
Industry: Technology
Language: English

# Crawling instructions
Crawl-delay: 1
Allow-training: Yes
Allow-commercial-use: No`,
    bestPractices: [
      'Keep file simple and clear',
      'Update when site structure changes',
      'Include most important pages',
      'Specify content licensing preferences'
    ],
    pitfalls: [
      'Making file too complex',
      'Forgetting to update file',
      'Not specifying licensing preferences',
      'Placing file in wrong location'
    ]
  },

  'robots_txt': {
    dimension: 'technical',
    icon: Search,
    overview: 'A properly configured robots.txt file guides search engine crawlers and protects sensitive content.',
    impact: 'Can improve crawling efficiency by 15-25 points',
    steps: [
      {
        title: 'Configure Robots.txt',
        description: 'Set up proper crawler instructions.',
        actions: [
          'Allow crawling of important content',
          'Block sensitive or duplicate pages',
          'Include XML sitemap location',
          'Set appropriate crawl delays'
        ]
      }
    ],
    code: `# robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/
Disallow: /api/
Disallow: /*.pdf$

# Allow important bots
User-agent: Googlebot
Allow: /

# Sitemap location
Sitemap: https://yoursite.com/sitemap.xml`,
    bestPractices: [
      'Test robots.txt with Google Search Console',
      'Keep file simple and clear',
      'Include sitemap location',
      'Regularly review and update'
    ],
    pitfalls: [
      'Accidentally blocking important pages',
      'Not including sitemap location',
      'Using wildcard patterns incorrectly',
      'Not testing changes'
    ]
  },

  'clean_html_structure': {
    dimension: 'technical',
    icon: Code,
    overview: 'Clean HTML structure is scored based on semantic HTML usage, content ratio, HTML validation errors, div usage, and accessibility basics. Starts at 100 points and deducts for issues.',
    impact: 'Can lose up to 100 points: Validation errors (-80), No semantic HTML (-40), Low content ratio (-30), Excessive divs (-20), Missing lang (-10)',
    steps: [
      {
        title: 'Add Semantic HTML5 Tags',
        description: 'Use semantic elements instead of generic divs (worth 40 points).',
        actions: [
          'Add <header> for page/section headers',
          'Use <nav> for navigation menus',
          'Wrap main content in <main>',
          'Use <article> for self-contained content',
          'Add <section> for content sections',
          'Include <footer> for page/section footers',
          'Use <aside> for sidebar content'
        ]
      },
      {
        title: 'Fix HTML Validation Errors',
        description: 'Reduce validation errors for better scores.',
        actions: [
          'Fix critical errors first (>15 errors = only 20/100 score)',
          'Address high priority errors (>10 errors = max 40/100)',
          'Fix moderate errors (>5 errors = max 60/100)',
          'Resolve all errors for perfect validation (0 errors = full points)',
          'Remove deprecated tags: font, center, marquee, blink, frame'
        ]
      },
      {
        title: 'Optimize Content Structure',
        description: 'Ensure content is in HTML, not JavaScript-loaded.',
        actions: [
          'Keep content-to-HTML ratio above 30%',
          'Reduce div usage to under 50% of all tags',
          'Add lang attribute to <html> tag (worth 10 points)',
          'Include <!DOCTYPE html> declaration',
          'Minimize inline styles (under 50 instances)'
        ]
      }
    ],
    code: `<!-- Perfect Score HTML Structure -->
<!DOCTYPE html> <!-- Required for proper rendering -->
<html lang="en"> <!-- lang attribute worth 10 points -->
<head>
  <meta charset="UTF-8">
  <title>Page Title</title>
</head>
<body>
  <!-- Semantic HTML5 tags (worth 40 points if missing) -->
  <header>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>
  
  <main> <!-- Critical semantic tag -->
    <article> <!-- Use semantic tags, not divs -->
      <h1>Main Title</h1>
      
      <section> <!-- Organize with sections -->
        <h2>Subheading</h2>
        <p>Content should be in raw HTML, not loaded by JavaScript.
        Keep content-to-HTML ratio above 30% to avoid penalties.</p>
      </section>
      
      <!-- Avoid excessive divs - keep under 50% of all tags -->
      <aside>
        <h3>Related Info</h3>
        <p>Use semantic elements instead of <div> wrappers.</p>
      </aside>
    </article>
  </main>
  
  <footer>
    <p>&copy; 2024 Company Name</p>
  </footer>
  
  <!-- Avoid deprecated tags: <font>, <center>, <marquee>, <blink> -->
  <!-- Minimize inline styles - keep under 50 instances -->
</body>
</html>`,
    bestPractices: [
      'Start with 100 points and avoid deductions',
      'Use all 7 semantic HTML5 tags for structure',
      'Keep HTML validation errors at 0 for full points',
      'Maintain 30%+ content-to-HTML ratio',
      'Keep div usage under 50% of total tags'
    ],
    pitfalls: [
      'No semantic HTML tags (-40 points immediately)',
      'More than 15 validation errors (-80 points)',
      'JavaScript-loaded content with low HTML ratio (-30)',
      'Missing lang attribute (-10 points)',
      'Using deprecated tags like <font> or <center>'
    ]
  },

  // Brand Guides
  'Increase brand mentions': {
    dimension: 'brand',
    icon: Globe,
    overview: 'Strategic brand mentions help AI models understand your brand identity and build association with your products/services.',
    impact: 'Can improve brand score by 20-35 points',
    steps: [
      {
        title: 'Natural Brand Integration',
        description: 'Incorporate brand mentions contextually.',
        actions: [
          'Mention brand in introduction',
          'Use brand in examples',
          'Include in case studies',
          'Add to conclusions naturally'
        ]
      },
      {
        title: 'Brand Storytelling',
        description: 'Weave brand narrative throughout content.',
        actions: [
          'Share brand origin story',
          'Highlight unique value propositions',
          'Include customer success stories',
          'Reference brand mission/values'
        ]
      }
    ],
    code: `<!-- Natural Brand Integration Example -->
<article>
  <h1>Complete Guide to Project Management</h1>
  
  <!-- Introduction with natural brand mention -->
  <p>At <strong>YourBrand</strong>, we've helped over 10,000 teams 
  streamline their project management. This guide shares our proven 
  methodology.</p>
  
  <!-- Case study with brand context -->
  <section>
    <h2>Real-World Success</h2>
    <p>When TechCorp implemented <strong>YourBrand's</strong> project 
    framework, they reduced delivery time by 40%. Here's how...</p>
  </section>
  
  <!-- Conclusion reinforcing brand -->
  <section>
    <h2>Start Your Journey</h2>
    <p>Ready to transform your project management? 
    <strong>YourBrand</strong> provides the tools and expertise 
    you need. <a href="/demo">See it in action</a>.</p>
  </section>
</article>`,
    bestPractices: [
      'Maintain 2-3% brand mention density',
      'Use variations (full name, abbreviated)',
      'Connect brand to value delivery',
      'Include in meta descriptions'
    ],
    pitfalls: [
      'Over-mentioning (keyword stuffing)',
      'Forced or unnatural placement',
      'Generic brand descriptions',
      'Missing brand in key sections'
    ]
  },

  'Brand schema markup': {
    dimension: 'brand',
    icon: Code2,
    overview: 'Organization schema helps search engines and AI understand your brand entity and relationships.',
    impact: 'Can improve brand score by 15-25 points',
    steps: [
      {
        title: 'Implement Organization Schema',
        description: 'Add comprehensive brand structured data.',
        actions: [
          'Include on homepage and about page',
          'Add logo and brand assets',
          'Include social profiles',
          'Add contact information'
        ]
      }
    ],
    code: `<!-- Organization Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "YourBrand",
  "alternateName": "YB",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "description": "Your brand description and value proposition",
  "foundingDate": "2010",
  "founders": [{
    "@type": "Person",
    "name": "Founder Name"
  }],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "City",
    "addressRegion": "State",
    "postalCode": "12345",
    "addressCountry": "US"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-555-555-5555",
    "contactType": "customer service",
    "areaServed": "US",
    "availableLanguage": ["en"]
  },
  "sameAs": [
    "https://facebook.com/yourbrand",
    "https://twitter.com/yourbrand",
    "https://linkedin.com/company/yourbrand",
    "https://youtube.com/yourbrand"
  ],
  "brand": {
    "@type": "Brand",
    "name": "YourBrand",
    "slogan": "Your brand tagline"
  }
}
</script>`,
    bestPractices: [
      'Keep schema consistent across pages',
      'Update with new social profiles',
      'Include all brand variations',
      'Add industry-specific properties'
    ],
    pitfalls: [
      'Inconsistent information',
      'Missing required fields',
      'Outdated contact details',
      'Not validating schema'
    ]
  }
};

// Helper function to find the best matching guide
function findGuideMatch(guideName: string): any {
  // First try exact match
  if (OPTIMIZATION_GUIDES[guideName]) {
    return OPTIMIZATION_GUIDES[guideName];
  }

  // Check for dimension-specific "Improve X Score" guides
  if (guideName.includes('Improve') && guideName.includes('Score')) {
    const dimensionMatch = guideName.match(/Improve (\w+) Score/);
    if (dimensionMatch) {
      const dimension = dimensionMatch[1];
      const guideKey = `Improve ${dimension} Score`;
      if (OPTIMIZATION_GUIDES[guideKey]) {
        return OPTIMIZATION_GUIDES[guideKey];
      }
    }
  }

  // Then try to find a guide that contains keywords from the issue
  const lowerGuideName = guideName.toLowerCase();
  
  // Common issue mappings including AEO rules
  const issueMappings: Record<string, string> = {
    // Traditional SEO mappings
    'backlink': 'Build more high-quality backlinks',
    'author': 'Add author information',
    'date': 'Add publish/update dates',
    'outdated': 'Update outdated content',
    'heading': 'Fix heading hierarchy',
    'h1': 'Fix heading hierarchy',
    'schema': 'Add schema markup',
    'meta': 'Improve meta tags',
    'brand': 'Increase brand mentions',
    'fresh': 'Update outdated content',
    'structure': 'Fix heading hierarchy',
    'citation': 'Improve citations',
    'reference': 'Improve citations',
    'no author': 'Add author information',
    'missing author': 'Add author information',
    'no date': 'Add publish/update dates',
    'missing date': 'Add publish/update dates',
    'no schema': 'Add schema markup',
    'missing schema': 'Add schema markup',
    'no brand': 'Increase brand mentions',
    'low brand': 'Increase brand mentions',
    'no meta': 'Improve meta tags',
    'missing meta': 'Improve meta tags',
    'duplicate': 'Improve meta tags',
    'no h1': 'Fix heading hierarchy',
    'multiple h1': 'Fix heading hierarchy',
    'missing h1': 'Fix heading hierarchy',
    'html validation': 'clean_html_structure',
    'validation errors': 'clean_html_structure',
    'html errors': 'clean_html_structure',
    'critical html': 'clean_html_structure',
    
    // AEO Content Rules
    'glossaries': 'glossaries',
    'concise_answers': 'concise_answers',
    'multimodal_content': 'multimodal_content',
    'image_alt': 'image_alt',
    'in_depth_guides': 'in_depth_guides',
    'comparison_content': 'comparison_content',
    'subheadings': 'subheadings',
    'content_freshness': 'content_freshness',
    'main_heading': 'main_heading',
    'case_studies': 'case_studies',
    'citing_sources': 'citing_sources',
    'definitional_content': 'definitional_content',
    'faq_pages': 'faq_pages',
    'how_to_content': 'how_to_content',
    'meta_description': 'meta_description',
    
    // AEO Authority Rules
    'press-release-distribution': 'press-release-distribution',
    'industry-publication-contributions': 'industry-publication-contributions',
    'author-credentials-bio-pages': 'author-credentials-bio-pages',
    'wikidata-presence': 'wikidata-presence',
    'wikipedia-presence': 'wikipedia-presence',
    
    // AEO Technical Rules
    'llms_txt': 'llms_txt',
    'robots_txt': 'robots_txt',
    'url_structure': 'url_structure',
    'structured_data': 'structured_data',
    'clean_html_structure': 'clean_html_structure',
    'https_security': 'https_security',
    'xml_sitemap': 'xml_sitemap',
    'status_code': 'status_code',
    'mobile_optimization': 'mobile_optimization',
    
    // Alternative mappings
    'glossary': 'glossaries',
    'answers': 'concise_answers',
    'multimedia': 'multimodal_content',
    'alt text': 'image_alt',
    'guides': 'in_depth_guides',
    'comparison': 'comparison_content',
    'subheading': 'subheadings',
    'freshness': 'content_freshness',
    'update content regularly': 'content_freshness',
    'maintain freshness': 'content_freshness',
    'publication and modification dates': 'content_freshness',
    'add publication': 'content_freshness',
    'comprehensive in-depth guides': 'in_depth_guides',
    'in-depth guides': 'in_depth_guides',
    'authoritative content': 'in_depth_guides',
    'detailed, authoritative content': 'in_depth_guides',
    'covers topics thoroughly': 'in_depth_guides',
    'h1 tag': 'main_heading',
    'case study': 'case_studies',
    'sources': 'citing_sources',
    'press release': 'press-release-distribution',
    'llms': 'llms_txt',
    'robots': 'robots_txt',
    'sitemap': 'xml_sitemap',
    'mobile': 'mobile_optimization',
  };

  // Check for keyword matches
  for (const [keyword, guideKey] of Object.entries(issueMappings)) {
    if (lowerGuideName.includes(keyword)) {
      return OPTIMIZATION_GUIDES[guideKey];
    }
  }

  return null;
}

export function OptimizationDrawer({
  isOpen,
  onClose,
  guideType,
  guideName,
  severity,
  dimension
}: OptimizationDrawerProps) {
  // Find the appropriate guide
  const guide = findGuideMatch(guideName);

  if (!guide) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Mint Guide</SheetTitle>
            <SheetDescription>
              Guide not found for: {guideName}
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const Icon = guide.icon || Info;
  const dimensionColor = DIMENSION_COLORS[guide.dimension as keyof typeof DIMENSION_COLORS] || '#6b7280';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[35%] overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${dimensionColor}20` }}
              >
                <Icon className="h-5 w-5" style={{ color: dimensionColor }} />
              </div>
              <div>
                <SheetTitle className="text-lg">{guideName}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant="outline"
                    style={{
                      borderColor: dimensionColor,
                      color: dimensionColor
                    }}
                  >
                    {guide.dimension}
                  </Badge>
                  {severity && (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS],
                        color: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS]
                      }}
                    >
                      {severity}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <SheetDescription className="text-sm">
            {guide.overview}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2 text-accent">
              <Target className="h-4 w-4" />
              <span className="font-semibold text-sm">Expected Impact</span>
            </div>
            <p className="text-xs text-green-700 mt-1">{guide.impact}</p>
          </div>

          <Tabs defaultValue="steps" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="steps">Steps</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="best">Best Practices</TabsTrigger>
              <TabsTrigger value="pitfalls">Pitfalls</TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="space-y-6">
              {guide.steps.map((step: any, index: number) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div 
                        className="flex items-center justify-center w-8 h-8 rounded-full text-white font-semibold text-sm flex-shrink-0"
                        style={{ backgroundColor: dimensionColor }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-3">
                        <h3 className="font-semibold text-base">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        <ul className="space-y-2">
                          {step.actions.map((action: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <span className="text-xs">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="code" className="space-y-4">
              {guide.code && (
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs">
                    <code>{guide.code}</code>
                  </pre>
                </div>
              )}
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Code2 className="h-4 w-4 mt-0.5" />
                <p>Copy and adapt this code to your specific implementation needs.</p>
              </div>
            </TabsContent>

            <TabsContent value="best" className="space-y-3">
              {guide.bestPractices.map((practice: string, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{practice}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="pitfalls" className="space-y-3">
              {guide.pitfalls.map((pitfall: string, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{pitfall}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-8 pt-6 border-t">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <Lightbulb className="h-4 w-4" />
              <span className="font-semibold">Pro Tip</span>
            </div>
            <p className="text-sm text-blue-700">
              Focus on implementing one optimization at a time. Measure the impact before moving to the next improvement to understand what works best for your specific context.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}