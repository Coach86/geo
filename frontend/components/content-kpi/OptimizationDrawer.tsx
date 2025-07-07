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
    dimension: 'content',
    icon: BookMarked,
    overview: 'Comprehensive guides demonstrate expertise and provide thorough coverage of complex topics, building authority with AI models.',
    impact: 'Can improve authority and content depth scores by 35-50 points',
    steps: [
      {
        title: 'Topic Research and Planning',
        description: 'Identify comprehensive topics that need in-depth coverage.',
        actions: [
          'Research keyword clusters around main topics',
          'Analyze competitor content for gaps',
          'Survey audience for detailed questions',
          'Plan logical content structure and flow'
        ]
      },
      {
        title: 'Create Comprehensive Content',
        description: 'Develop thorough, well-researched content.',
        actions: [
          'Cover topics from beginner to advanced levels',
          'Include practical examples and case studies',
          'Add step-by-step instructions with visuals',
          'Provide actionable takeaways and next steps'
        ]
      },
      {
        title: 'Enhance with Supporting Elements',
        description: 'Add depth with multimedia and interactive elements.',
        actions: [
          'Include relevant charts, graphs, and infographics',
          'Add downloadable resources and templates',
          'Create interactive elements like calculators',
          'Include expert quotes and external references'
        ]
      }
    ],
    code: `<!-- Guide Structure with Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Complete Guide to SEO Optimization",
  "description": "A comprehensive guide covering all aspects of SEO",
  "totalTime": "PT3H",
  "supply": ["Website", "SEO tools", "Analytics platform"],
  "step": [
    {
      "@type": "HowToStep",
      "name": "Keyword Research",
      "text": "Identify target keywords using research tools"
    }
  ]
}
</script>

<!-- Article Structure -->
<article class="guide">
  <header>
    <h1>The Complete Guide to SEO Optimization</h1>
    <p class="guide-meta">Last updated: January 2024 • 15 min read</p>
  </header>
  
  <nav class="table-of-contents">
    <h2>Table of Contents</h2>
    <ol>
      <li><a href="#keyword-research">Keyword Research</a></li>
      <li><a href="#on-page-optimization">On-Page Optimization</a></li>
    </ol>
  </nav>
  
  <section id="keyword-research">
    <h2>1. Keyword Research</h2>
    <!-- Detailed content -->
  </section>
</article>`,
    bestPractices: [
      'Create comprehensive table of contents',
      'Include estimated reading time',
      'Add downloadable summaries or checklists',
      'Update content regularly to maintain accuracy'
    ],
    pitfalls: [
      'Making guides too superficial',
      'Not providing actionable advice',
      'Forgetting to update outdated information',
      'Missing clear next steps for readers'
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
    dimension: 'freshness',
    icon: Calendar,
    overview: 'Fresh, regularly updated content signals relevance and helps maintain high search rankings and AI model preference.',
    impact: 'Can improve freshness scores by 25-45 points',
    steps: [
      {
        title: 'Audit Content Age',
        description: 'Identify content that needs updating.',
        actions: [
          'Review publish dates on all content',
          'Identify pages with declining traffic',
          'Check for outdated information or statistics',
          'Prioritize high-value pages for updates'
        ]
      },
      {
        title: 'Update Content Regularly',
        description: 'Implement a content refresh strategy.',
        actions: [
          'Add new sections with current information',
          'Update statistics and data points',
          'Refresh examples and case studies',
          'Remove or update broken links'
        ]
      },
      {
        title: 'Signal Content Updates',
        description: 'Make content freshness visible to users and search engines.',
        actions: [
          'Update modified dates in schema markup',
          'Add "Last updated" notices',
          'Include changelog for major updates',
          'Share updates on social media'
        ]
      }
    ],
    code: `<!-- Content Freshness Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "datePublished": "2023-01-15",
  "dateModified": "2024-01-20",
  "headline": "SEO Best Practices Guide",
  "description": "Updated guide covering latest SEO trends and techniques"
}
</script>

<!-- Update Notice -->
<div class="content-freshness">
  <p class="update-notice">
    <strong>Last Updated:</strong> January 20, 2024
  </p>
  <details class="changelog">
    <summary>What's New</summary>
    <ul>
      <li>Added section on AI search optimization</li>
      <li>Updated Google algorithm changes for 2024</li>
      <li>New case studies and examples</li>
    </ul>
  </details>
</div>`,
    bestPractices: [
      'Set up content review schedules',
      'Monitor competitor content updates',
      'Track performance after updates',
      'Document changes made'
    ],
    pitfalls: [
      'Only changing dates without real updates',
      'Forgetting to update related content',
      'Not promoting content updates',
      'Removing valuable historical information'
    ]
  },

  'main_heading': {
    dimension: 'structure',
    icon: Heading1,
    overview: 'A clear, descriptive main heading (H1) helps users and AI models understand the primary topic of your content.',
    impact: 'Can improve structure and SEO scores by 15-25 points',
    steps: [
      {
        title: 'Optimize H1 Tags',
        description: 'Create compelling, keyword-rich main headings.',
        actions: [
          'Use only one H1 tag per page',
          'Include primary keyword near the beginning',
          'Keep under 60 characters for SEO',
          'Make it match or closely relate to title tag'
        ]
      },
      {
        title: 'Write for Users First',
        description: 'Balance SEO with user experience.',
        actions: [
          'Make headings descriptive and compelling',
          'Use natural language, not keyword stuffing',
          'Ensure heading accurately describes content',
          'Consider emotional impact and clarity'
        ]
      }
    ],
    code: `<!-- Good H1 Examples -->
<h1>Complete Guide to Email Marketing in 2024</h1>
<h1>How to Build a WordPress Website: Step-by-Step Tutorial</h1>
<h1>Top 10 Project Management Tools for Remote Teams</h1>

<!-- H1 with Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Complete Guide to Email Marketing in 2024",
  "description": "Learn proven email marketing strategies..."
}
</script>

<!-- Bad H1 Examples to Avoid -->
<!-- <h1>Welcome</h1> (too vague) -->
<!-- <h1>Best Email Marketing Tools Software Solutions</h1> (keyword stuffing) -->`,
    bestPractices: [
      'Make H1 unique on each page',
      'Include primary target keyword',
      'Keep it under 60 characters',
      'Match user search intent'
    ],
    pitfalls: [
      'Using multiple H1 tags',
      'Making it too generic or vague',
      'Keyword stuffing in headings',
      'Not matching title tag'
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
    overview: 'Clean HTML structure ensures proper page rendering, accessibility, and efficient AI content processing.',
    impact: 'Can improve technical scores by 25-40 points and reduce page load times',
    steps: [
      {
        title: 'Fix HTML Validation Errors',
        description: 'Identify and resolve critical HTML errors.',
        actions: [
          'Run HTML validator to identify all errors',
          'Fix unclosed tags and attribute errors',
          'Ensure proper nesting of elements',
          'Remove deprecated HTML elements',
          'Fix duplicate IDs and invalid attributes'
        ]
      },
      {
        title: 'Optimize HTML Structure',
        description: 'Improve overall HTML organization.',
        actions: [
          'Use semantic HTML5 elements (article, section, nav)',
          'Implement proper heading hierarchy (H1-H6)',
          'Add ARIA labels for accessibility',
          'Minimize nested div structures',
          'Use appropriate HTML elements for content type'
        ]
      },
      {
        title: 'Validate and Test',
        description: 'Ensure HTML meets standards.',
        actions: [
          'Test with W3C HTML validator',
          'Check accessibility with screen readers',
          'Verify cross-browser compatibility',
          'Test mobile responsiveness',
          'Monitor Core Web Vitals impact'
        ]
      }
    ],
    code: `<!-- Example: Clean HTML Structure -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
</head>
<body>
  <header>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>
  
  <main>
    <article>
      <header>
        <h1>Article Title</h1>
        <time datetime="2024-01-01">January 1, 2024</time>
      </header>
      
      <section>
        <h2>Section Heading</h2>
        <p>Well-structured content...</p>
      </section>
    </article>
  </main>
  
  <footer>
    <p>&copy; 2024 Company Name</p>
  </footer>
</body>
</html>`,
    bestPractices: [
      'Always use DOCTYPE declaration',
      'Include lang attribute on html element',
      'Use semantic HTML5 elements',
      'Maintain proper heading hierarchy',
      'Validate HTML regularly',
      'Include alt text for images',
      'Use ARIA labels appropriately',
      'Minimize inline styles and scripts'
    ],
    pitfalls: [
      'Using divs instead of semantic elements',
      'Skipping heading levels (H1 to H3)',
      'Missing alt attributes on images',
      'Duplicate IDs on same page',
      'Unclosed or improperly nested tags',
      'Missing meta charset declaration',
      'Using deprecated HTML elements',
      'Not validating HTML after changes'
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