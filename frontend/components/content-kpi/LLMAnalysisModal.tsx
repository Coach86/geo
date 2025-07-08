'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Code, 
  FileText, 
  Sparkles, 
  Clock, 
  Hash,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { toast } from '@/hooks/use-toast';

interface LLMAnalysisModalProps {
  projectId: string;
  pageUrl: string;
  trigger?: React.ReactNode;
}

interface LLMCall {
  purpose: string;
  prompt: string;
  response: string;
  model: string;
  timestamp: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
  error?: string;
}

interface LLMAnalysisData {
  url: string;
  analysisType: 'unified' | 'static';
  message?: string;
  llmCalls?: LLMCall[];
  // Legacy fields for backward compatibility
  model?: string;
  timestamp?: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
  prompt?: string;
  response?: string;
}

export function LLMAnalysisModal({ projectId, pageUrl, trigger }: LLMAnalysisModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LLMAnalysisData | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<number>(0);
  const { token } = useAuth();

  const fetchLLMAnalysis = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const encodedUrl = encodeURIComponent(pageUrl);
      const response = await apiFetch(
        `/user/projects/${projectId}/crawler/content-scores/${encodedUrl}/llm-analysis`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setData(response as LLMAnalysisData);
    } catch (error) {
      console.error('Error fetching LLM analysis:', error);
      toast({
        title: 'Error',
        description: 'Failed to load LLM analysis details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSelectedCall(0); // Reset to first call when opening
      if (!data) {
        fetchLLMAnalysis();
      }
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
      toast({
        title: 'Copied!',
        description: `${section.charAt(0).toUpperCase() + section.slice(1)} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const formatJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            View AI Analysis
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>AI Analysis Details</DialogTitle>
          <DialogDescription>
            {pageUrl}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Check analysisType first, then llmCalls */}
            {data.analysisType === 'static' ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-5 w-5" />
                    <p>{data.message || 'This page was analyzed using static rules without AI assistance.'}</p>
                  </div>
                </CardContent>
              </Card>
            ) : data.llmCalls && data.llmCalls.length > 0 ? (
              <>
                {/* LLM Call Selector */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">LLM Calls ({data.llmCalls.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {data.llmCalls.map((call, index) => (
                      <Button
                        key={index}
                        variant={selectedCall === index ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCall(index)}
                        className="text-xs"
                      >
                        {call.purpose.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {call.error && (
                          <AlertCircle className="h-3 w-3 ml-1 text-destructive" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Selected Call Details */}
                {data.llmCalls[selectedCall] && (
                  <>
                    {/* Metadata */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        <Code className="h-3 w-3 mr-1" />
                        {data.llmCalls[selectedCall].model}
                      </Badge>
                      
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(data.llmCalls[selectedCall].timestamp).toLocaleString()}
                      </Badge>
                      
                      {data.llmCalls[selectedCall].tokensUsed && (
                        <Badge variant="outline">
                          <Hash className="h-3 w-3 mr-1" />
                          {data.llmCalls[selectedCall].tokensUsed.input + data.llmCalls[selectedCall].tokensUsed.output} tokens
                        </Badge>
                      )}
                      
                      {data.llmCalls[selectedCall].error && (
                        <Badge variant="destructive">
                          Error: {data.llmCalls[selectedCall].error}
                        </Badge>
                      )}
                    </div>

                    {/* Prompt and Response Tabs */}
                    <Tabs defaultValue="prompt" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="prompt">
                          <FileText className="h-4 w-4 mr-2" />
                          Prompt
                        </TabsTrigger>
                        <TabsTrigger value="response">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Response
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="prompt" className="mt-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">AI Prompt</CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(data.llmCalls![selectedCall].prompt, `prompt-${selectedCall}`)}
                              >
                                {copiedSection === `prompt-${selectedCall}` ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                              <pre className="text-xs whitespace-pre-wrap font-mono">
                                {data.llmCalls[selectedCall].prompt}
                              </pre>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="response" className="mt-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">AI Response</CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(data.llmCalls![selectedCall].response, `response-${selectedCall}`)}
                              >
                                {copiedSection === `response-${selectedCall}` ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                              <pre className="text-xs whitespace-pre-wrap font-mono">
                                {formatJSON(data.llmCalls[selectedCall].response)}
                              </pre>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>

                    {/* Token Usage */}
                    {data.llmCalls[selectedCall].tokensUsed && (
                      <div className="text-xs text-muted-foreground">
                        Token usage: {data.llmCalls[selectedCall].tokensUsed.input} input + {data.llmCalls[selectedCall].tokensUsed.output} output = {data.llmCalls[selectedCall].tokensUsed.input + data.llmCalls[selectedCall].tokensUsed.output} total
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-5 w-5" />
                    <p>No detailed LLM analysis data available.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}