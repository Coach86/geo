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
  BookOpen
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
};

// Comprehensive guide mappings
const OPTIMIZATION_GUIDES: Record<string, any> = {
  // Overview Guide
  'Optimization Guide Overview': {
    dimension: 'overview',
    icon: BookOpen,
    overview: 'Welcome to the Mint Page Intelligence Optimization Guide. This comprehensive resource helps you implement improvements across all content dimensions.',
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

  // Then try to find a guide that contains keywords from the issue
  const lowerGuideName = guideName.toLowerCase();
  
  // Common issue mappings
  const issueMappings: Record<string, string> = {
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
            <SheetTitle>Optimization Guide</SheetTitle>
            <SheetDescription>
              Guide not found for: {guideName}
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const Icon = guide.icon || Info;
  const dimensionColor = DIMENSION_COLORS[guide.dimension] || '#6b7280';

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
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2 text-green-800">
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