import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  FileText,
  Download,
  FileJson,
  FileSpreadsheet,
  FileCode
} from "lucide-react";

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  type: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  affectedPages: string[];
}

interface AIOptimizationPanelProps {
  recommendations: Recommendation[];
}

export default function AIOptimizationPanel({ recommendations }: AIOptimizationPanelProps) {
  const [expandedGuides, setExpandedGuides] = useState<Set<number>>(new Set());
  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          color: 'destructive',
          icon: AlertCircle,
          label: 'High Priority'
        };
      case 'medium':
        return {
          color: 'warning',
          icon: Clock,
          label: 'Medium Priority'
        };
      case 'low':
        return {
          color: 'secondary',
          icon: CheckCircle,
          label: 'Low Priority'
        };
      default:
        return {
          color: 'outline',
          icon: Lightbulb,
          label: priority
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'keyword_optimization':
        return '🔍';
      case 'semantic_optimization':
        return '🧠';
      case 'context_enrichment':
        return '📝';
      case 'content_gaps':
        return '🚫';
      case 'structured_data':
        return '📊';
      case 'content_structure':
        return '🏗️';
      default:
        return '💡';
    }
  };

  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    if (!acc[rec.priority]) {
      acc[rec.priority] = [];
    }
    acc[rec.priority].push(rec);
    return acc;
  }, {} as Record<string, Recommendation[]>);

  const exportAsText = () => {
    const content = recommendations.map(rec => 
      `${rec.title}\n` +
      `Priority: ${rec.priority}\n` +
      `Description: ${rec.description}\n` +
      `Impact: ${rec.impact}\n` +
      `Effort: ${rec.effort}\n` +
      `Affected Pages: ${rec.affectedPages.join(', ')}\n` +
      `---\n`
    ).join('\n');

    downloadFile(content, 'ai-visibility-recommendations.txt', 'text/plain');
  };

  const exportAsCSV = () => {
    const headers = ['Title', 'Priority', 'Type', 'Description', 'Impact', 'Effort', 'Affected Pages'];
    const rows = recommendations.map(rec => [
      rec.title,
      rec.priority,
      rec.type,
      rec.description,
      rec.impact,
      rec.effort,
      rec.affectedPages.join('; ')
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    downloadFile(csv, 'ai-visibility-recommendations.csv', 'text/csv');
  };

  const exportAsJSON = () => {
    const json = JSON.stringify({
      generatedAt: new Date().toISOString(),
      totalRecommendations: recommendations.length,
      byPriority: {
        high: recommendations.filter(r => r.priority === 'high').length,
        medium: recommendations.filter(r => r.priority === 'medium').length,
        low: recommendations.filter(r => r.priority === 'low').length
      },
      recommendations
    }, null, 2);

    downloadFile(json, 'ai-visibility-recommendations.json', 'application/json');
  };

  const exportAsHTML = () => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AI Visibility Recommendations</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .priority-section { margin-bottom: 30px; }
    .priority-high { border-left: 4px solid #ef4444; }
    .priority-medium { border-left: 4px solid #f59e0b; }
    .priority-low { border-left: 4px solid #6b7280; }
    .recommendation { background: #f5f5f5; padding: 15px; margin-bottom: 15px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .affected-pages { margin-top: 10px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <h1>AI Visibility Recommendations</h1>
  <p>Generated on ${new Date().toLocaleDateString()}</p>
  
  ${['high', 'medium', 'low'].map(priority => {
    const recs = groupedRecommendations[priority];
    if (!recs || recs.length === 0) return '';
    
    return `
    <div class="priority-section">
      <h2>${getPriorityInfo(priority).label} (${recs.length} items)</h2>
      ${recs.map(rec => `
        <div class="recommendation priority-${priority}">
          <h3>${getTypeIcon(rec.type)} ${rec.title}</h3>
          <p>${rec.description}</p>
          <div class="meta">
            <div><strong>Impact:</strong> ${rec.impact}</div>
            <div><strong>Effort:</strong> ${rec.effort}</div>
          </div>
          ${rec.affectedPages.length > 0 ? `
            <div class="affected-pages">
              <strong>Affected Pages:</strong><br>
              ${rec.affectedPages.map(page => `• ${page}`).join('<br>')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    `;
  }).join('')}
</body>
</html>
    `;

    downloadFile(html, 'ai-visibility-recommendations.html', 'text/html');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleGuide = (index: number) => {
    const newExpanded = new Set(expandedGuides);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedGuides(newExpanded);
  };

  const getImplementationGuide = (type: string, rec: Recommendation) => {
    const guides: Record<string, JSX.Element> = {
      keyword_optimization: (
        <div className="space-y-2 text-sm">
          <p><strong>1. Keyword Research:</strong> Identify missing keywords from search queries</p>
          <p><strong>2. Content Update:</strong> Naturally incorporate keywords into existing content</p>
          <p><strong>3. Meta Tags:</strong> Update title tags and meta descriptions with target keywords</p>
          <p><strong>4. Headers:</strong> Include keywords in H1-H3 tags where relevant</p>
          <p><strong>5. Internal Linking:</strong> Use keyword-rich anchor text for internal links</p>
        </div>
      ),
      semantic_optimization: (
        <div className="space-y-2 text-sm">
          <p><strong>1. Context Enrichment:</strong> Add related concepts and synonyms</p>
          <p><strong>2. Topic Clusters:</strong> Create comprehensive content around core topics</p>
          <p><strong>3. Entity Relationships:</strong> Clearly define relationships between concepts</p>
          <p><strong>4. FAQ Sections:</strong> Add Q&A content to capture conversational queries</p>
          <p><strong>5. Schema Markup:</strong> Implement structured data for better understanding</p>
        </div>
      ),
      context_enrichment: (
        <div className="space-y-2 text-sm">
          <p><strong>1. Background Info:</strong> Provide comprehensive background information</p>
          <p><strong>2. Examples:</strong> Add real-world examples and use cases</p>
          <p><strong>3. Definitions:</strong> Define technical terms and concepts</p>
          <p><strong>4. Visual Content:</strong> Include diagrams, charts, and infographics</p>
          <p><strong>5. Related Resources:</strong> Link to authoritative external sources</p>
        </div>
      ),
      content_gaps: (
        <div className="space-y-2 text-sm">
          <p><strong>1. Gap Analysis:</strong> Review missing topics from competitor content</p>
          <p><strong>2. Content Creation:</strong> Develop new pages for uncovered topics</p>
          <p><strong>3. Content Expansion:</strong> Expand existing pages with missing information</p>
          <p><strong>4. User Intent:</strong> Align content with search intent</p>
          <p><strong>5. Content Calendar:</strong> Plan regular content updates</p>
        </div>
      ),
      structured_data: (
        <div className="space-y-2 text-sm">
          <p><strong>1. Schema Selection:</strong> Choose appropriate schema.org types</p>
          <p><strong>2. JSON-LD Implementation:</strong> Add structured data in JSON-LD format</p>
          <p><strong>3. Rich Snippets:</strong> Optimize for featured snippets and rich results</p>
          <p><strong>4. Testing:</strong> Validate with Google's Structured Data Testing Tool</p>
          <p><strong>5. Monitoring:</strong> Track performance in Search Console</p>
        </div>
      ),
      content_structure: (
        <div className="space-y-2 text-sm">
          <p><strong>1. Heading Hierarchy:</strong> Implement proper H1-H6 structure</p>
          <p><strong>2. Paragraph Length:</strong> Keep paragraphs concise (3-4 sentences)</p>
          <p><strong>3. Lists & Tables:</strong> Use lists and tables for better scanability</p>
          <p><strong>4. Navigation:</strong> Add table of contents for long content</p>
          <p><strong>5. Mobile Optimization:</strong> Ensure content is mobile-friendly</p>
        </div>
      )
    };

    return guides[type] || (
      <div className="text-sm text-muted-foreground">
        <p>Custom implementation guide for this recommendation:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Analyze the specific issues identified</li>
          <li>Create an action plan based on priority</li>
          <li>Implement changes incrementally</li>
          <li>Test and measure impact</li>
          <li>Iterate based on results</li>
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Optimization Recommendations</h3>
          <p className="text-sm text-muted-foreground">
            Actionable insights to improve your AI visibility
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportAsText}>
              <FileText className="mr-2 h-4 w-4" />
              Text File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsCSV}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              CSV File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsJSON}>
              <FileJson className="mr-2 h-4 w-4" />
              JSON File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsHTML}>
              <FileCode className="mr-2 h-4 w-4" />
              HTML Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {['high', 'medium', 'low'].map(priority => {
        const recs = groupedRecommendations[priority];
        if (!recs || recs.length === 0) return null;

        const priorityInfo = getPriorityInfo(priority);
        const Icon = priorityInfo.icon;

        return (
          <div key={priority} className="space-y-4">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <h4 className="font-medium">{priorityInfo.label}</h4>
              <Badge variant={priorityInfo.color as any}>
                {recs.length} {recs.length === 1 ? 'item' : 'items'}
              </Badge>
            </div>

            <div className="space-y-3">
              {recs.map((rec, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="text-xl">{getTypeIcon(rec.type)}</span>
                      {rec.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{rec.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Impact:</span>
                        <p className="text-muted-foreground">{rec.impact}</p>
                      </div>
                      <div>
                        <span className="font-medium">Effort:</span>
                        <p className="text-muted-foreground">{rec.effort}</p>
                      </div>
                    </div>

                    {rec.affectedPages.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Affected Pages:</p>
                        <div className="space-y-1">
                          {rec.affectedPages.map((page, pageIndex) => (
                            <div key={pageIndex} className="text-xs text-muted-foreground flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span className="truncate">{page}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => toggleGuide(index)}
                    >
                      {expandedGuides.has(index) ? 'Hide' : 'View'} Implementation Guide
                      <ArrowRight className={`ml-2 h-4 w-4 transition-transform ${expandedGuides.has(index) ? 'rotate-90' : ''}`} />
                    </Button>

                    {expandedGuides.has(index) && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-md space-y-2">
                        <h5 className="font-medium text-sm">Implementation Guide</h5>
                        {getImplementationGuide(rec.type, rec)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {recommendations.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No recommendations available yet. Run a scan to get optimization insights.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}