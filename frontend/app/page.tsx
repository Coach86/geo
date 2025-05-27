"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/providers/auth-provider";
import {
  getCompanyById,
  getPromptSet,
  updateIdentityCard,
  updatePromptSet,
  IdentityCardResponse,
  PromptSet
} from "@/lib/auth-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Building2,
  Globe,
  Languages,
  Calendar,
  RefreshCw,
  ChevronDown,
  MessageSquare,
  Brain,
  Target,
  CheckCircle,
  Swords,
  Edit2,
  Plus,
  X,
  Eye,
} from 'lucide-react';

export default function Home() {
  const { token } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<IdentityCardResponse | null>(null);
  const [promptSet, setPromptSet] = useState<PromptSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Modal states
  const [editAttributesOpen, setEditAttributesOpen] = useState(false);
  const [editCompetitorsOpen, setEditCompetitorsOpen] = useState(false);

  // Temporary edit states
  const [editingAttributes, setEditingAttributes] = useState<string[]>([]);
  const [editingCompetitors, setEditingCompetitors] = useState<string[]>([]);

  // Inline prompt editing states
  const [editingPromptType, setEditingPromptType] = useState<string | null>(null);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [editingPromptValue, setEditingPromptValue] = useState("");

  // Save loading states
  const [savingAttributes, setSavingAttributes] = useState(false);
  const [savingCompetitors, setSavingCompetitors] = useState(false);

  // Get selected company from localStorage or dashboard context
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      const selectedCompanyId = localStorage.getItem("selectedCompanyId");

      if (!selectedCompanyId || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const companyData = await getCompanyById(selectedCompanyId, token);
        setSelectedCompany(companyData);
        setError(null);

        // Fetch prompt set
        setLoadingPrompts(true);
        try {
          const prompts = await getPromptSet(selectedCompanyId, token);
          setPromptSet(prompts);
        } catch (promptErr) {
          console.error("Failed to fetch prompt set:", promptErr);
          // Don't set error for prompt set, it's optional
          setPromptSet(null);
        } finally {
          setLoadingPrompts(false);
        }
      } catch (err) {
        console.error("Failed to fetch company details:", err);
        setError("Failed to load company details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyDetails();

    // Listen for storage changes to update when company selection changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompanyId" && e.newValue) {
        fetchCompanyDetails();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events for same-tab updates
    const handleCompanyChange = () => {
      fetchCompanyDetails();
    };

    window.addEventListener("companySelectionChanged", handleCompanyChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("companySelectionChanged", handleCompanyChange);
    };
  }, [token]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMarketEmoji = (market: string) => {
    const marketFlags: { [key: string]: string } = {
      "United States": "🇺🇸",
      "United Kingdom": "🇬🇧",
      "Canada": "🇨🇦",
      "Australia": "🇦🇺",
      "Germany": "🇩🇪",
      "France": "🇫🇷",
      "Japan": "🇯🇵",
      "China": "🇨🇳",
      "India": "🇮🇳",
      "Brazil": "🇧🇷",
      "Mexico": "🇲🇽",
      "Spain": "🇪🇸",
      "Italy": "🇮🇹",
      "Netherlands": "🇳🇱",
      "Sweden": "🇸🇪",
      "Global": "🌐",
    };
    return marketFlags[market] || "🌐";
  };

  const getLanguageEmoji = (language: string) => {
    const languageFlags: { [key: string]: string } = {
      "en": "🇬🇧",
      "es": "🇪🇸",
      "fr": "🇫🇷",
      "de": "🇩🇪",
      "it": "🇮🇹",
      "pt": "🇵🇹",
      "ja": "🇯🇵",
      "zh": "🇨🇳",
      "ko": "🇰🇷",
      "ar": "🇸🇦",
      "hi": "🇮🇳",
      "ru": "🇷🇺",
    };
    return languageFlags[language] || "🌐";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Company Profile
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage your company's brand identity information
          </p>
        </div>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && !selectedCompany && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a company from the sidebar to view its profile.
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && selectedCompany && (
          <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Company Header */}
            <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm animate-in zoom-in-50 duration-300">
                      <Building2 className="h-8 w-8 text-gray-700" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900">{selectedCompany.brandName}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{selectedCompany.industry}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="border-gray-200 bg-white/80 hover:bg-gray-50 transition-colors">
                      <Globe className="mr-1 h-3 w-3" />
                      {getMarketEmoji(selectedCompany.market)} {selectedCompany.market}
                    </Badge>
                    <Badge variant="outline" className="border-gray-200 bg-white/80 hover:bg-gray-50 transition-colors">
                      <Languages className="mr-1 h-3 w-3" />
                      {getLanguageEmoji(selectedCompany.language || "en")} {selectedCompany.language?.toUpperCase() || "EN"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="group">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-2">Website</h3>
                    <a
                      href={selectedCompany.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 group"
                    >
                      <span className="border-b border-transparent group-hover:border-blue-600 transition-all duration-200">
                        {selectedCompany.website}
                      </span>
                      <svg className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <div className="relative">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-2">Description</h3>
                    <div className="relative pl-4">
                      {/* Bookmark color line */}
                      <div className={`absolute left-0 top-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full transition-all duration-300 ${isDescriptionExpanded ? 'h-full' : 'h-6'}`}></div>

                      <div
                        className="cursor-pointer group"
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      >
                        <p className={`text-sm text-gray-700 leading-relaxed transition-all duration-300 ${!isDescriptionExpanded ? 'line-clamp-1' : ''}`}>
                          {selectedCompany.longDescription || selectedCompany.shortDescription}
                        </p>

                        {/* Show expand/collapse button if description is long enough */}
                        {(selectedCompany.longDescription || selectedCompany.shortDescription).length > 100 && (
                          <button
                            className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDescriptionExpanded(!isDescriptionExpanded);
                            }}
                          >
                            <span>{isDescriptionExpanded ? 'Show less' : 'Show more'}</span>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isDescriptionExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Brand Attributes and Competitors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Key Brand Attributes */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-500 rounded-full group-hover:h-5 transition-all duration-300"></div>
                      Key Brand Attributes
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      onClick={() => {
                        setEditingAttributes(selectedCompany?.keyBrandAttributes || []);
                        setEditAttributesOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompany.keyBrandAttributes.length > 0 ? (
                      selectedCompany.keyBrandAttributes.map((attribute, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors duration-200 animate-in slide-in-from-left-5"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {attribute}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 italic">No brand attributes defined</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Competitors */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-500 rounded-full group-hover:h-5 transition-all duration-300"></div>
                      Competitors
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      onClick={() => {
                        setEditingCompetitors(selectedCompany?.competitors || []);
                        setEditCompetitorsOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompany.competitors.length > 0 ? (
                      selectedCompany.competitors.map((competitor, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors duration-200 animate-in slide-in-from-right-5"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {competitor}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 italic">No competitors defined</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Prompts Section */}
            {promptSet && (
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-green-500 to-teal-500 rounded-full group-hover:h-5 transition-all duration-300"></div>
                         Prompts Portfolio
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Generated prompts used for analyzing brand perception across LLMs
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="spontaneous" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 mb-4">
                      <TabsTrigger value="spontaneous" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Visibility ({promptSet.spontaneous.length})
                      </TabsTrigger>
                      <TabsTrigger value="direct" className="text-xs">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Sentiment ({promptSet.direct.length})
                      </TabsTrigger>
                      <TabsTrigger value="accuracy" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Accord ({promptSet.accuracy.length})
                      </TabsTrigger>
                      <TabsTrigger value="battle" className="text-xs">
                        <Swords className="h-3 w-3 mr-1" />
                        Battle ({promptSet.brandBattle.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="spontaneous" className="space-y-2 mt-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Visibility Prompts</div>
                      <div className="space-y-2">
                        {promptSet.spontaneous.map((prompt, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors animate-in slide-in-from-bottom-2 cursor-pointer"
                            style={{ animationDelay: `${index * 30}ms` }}
                            onClick={() => {
                              setEditingPromptType("spontaneous");
                              setEditingPromptIndex(index);
                              setEditingPromptValue(prompt);
                            }}
                          >
                            {editingPromptType === "spontaneous" && editingPromptIndex === index ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingPromptValue}
                                  onChange={(e) => setEditingPromptValue(e.target.value)}
                                  autoFocus
                                  className="min-h-[60px] resize-none"
                                  onBlur={() => {
                                    // Save on blur
                                    const newPrompts = [...promptSet.spontaneous];
                                    newPrompts[index] = editingPromptValue;
                                    
                                    // Update promptSet
                                    const updatedPromptSet = {
                                      ...promptSet,
                                      spontaneous: newPrompts
                                    };
                                    setPromptSet(updatedPromptSet);
                                    
                                    // Save to backend
                                    if (selectedCompany && token) {
                                      updatePromptSet(
                                        selectedCompany.id,
                                        {
                                          spontaneous: newPrompts,
                                          direct: promptSet.direct,
                                          comparison: promptSet.comparison || [],
                                          accuracy: promptSet.accuracy,
                                          brandBattle: promptSet.brandBattle,
                                        },
                                        token
                                      ).catch(error => {
                                        console.error("Failed to save prompt:", error);
                                        // Revert on error
                                        setPromptSet(promptSet);
                                      });
                                    }
                                    
                                    setEditingPromptType(null);
                                    setEditingPromptIndex(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            ) : (
                              prompt
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="direct" className="space-y-2 mt-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Direct Sentiment Prompts</div>
                      <div className="space-y-2">
                        {promptSet.direct.map((prompt, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors animate-in slide-in-from-bottom-2 cursor-pointer"
                            style={{ animationDelay: `${index * 30}ms` }}
                            onClick={() => {
                              setEditingPromptType("direct");
                              setEditingPromptIndex(index);
                              setEditingPromptValue(prompt);
                            }}
                          >
                            {editingPromptType === "direct" && editingPromptIndex === index ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingPromptValue}
                                  onChange={(e) => setEditingPromptValue(e.target.value)}
                                  autoFocus
                                  className="min-h-[60px] resize-none"
                                  onBlur={() => {
                                    // Save on blur
                                    const newPrompts = [...promptSet.direct];
                                    newPrompts[index] = editingPromptValue;
                                    
                                    // Update promptSet
                                    const updatedPromptSet = {
                                      ...promptSet,
                                      direct: newPrompts
                                    };
                                    setPromptSet(updatedPromptSet);
                                    
                                    // Save to backend
                                    if (selectedCompany && token) {
                                      updatePromptSet(
                                        selectedCompany.id,
                                        {
                                          spontaneous: promptSet.spontaneous,
                                          direct: newPrompts,
                                          comparison: promptSet.comparison || [],
                                          accuracy: promptSet.accuracy,
                                          brandBattle: promptSet.brandBattle,
                                        },
                                        token
                                      ).catch(error => {
                                        console.error("Failed to save prompt:", error);
                                        // Revert on error
                                        setPromptSet(promptSet);
                                      });
                                    }
                                    
                                    setEditingPromptType(null);
                                    setEditingPromptIndex(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            ) : (
                              prompt
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="accuracy" className="space-y-2 mt-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Compliance Evaluation Prompts</div>
                      <div className="space-y-2">
                        {promptSet.accuracy.map((prompt, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors animate-in slide-in-from-bottom-2 cursor-pointer"
                            style={{ animationDelay: `${index * 30}ms` }}
                            onClick={() => {
                              setEditingPromptType("accuracy");
                              setEditingPromptIndex(index);
                              setEditingPromptValue(prompt);
                            }}
                          >
                            {editingPromptType === "accuracy" && editingPromptIndex === index ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingPromptValue}
                                  onChange={(e) => setEditingPromptValue(e.target.value)}
                                  autoFocus
                                  className="min-h-[60px] resize-none"
                                  onBlur={() => {
                                    // Save on blur
                                    const newPrompts = [...promptSet.accuracy];
                                    newPrompts[index] = editingPromptValue;
                                    
                                    // Update promptSet
                                    const updatedPromptSet = {
                                      ...promptSet,
                                      accuracy: newPrompts
                                    };
                                    setPromptSet(updatedPromptSet);
                                    
                                    // Save to backend
                                    if (selectedCompany && token) {
                                      updatePromptSet(
                                        selectedCompany.id,
                                        {
                                          spontaneous: promptSet.spontaneous,
                                          direct: promptSet.direct,
                                          comparison: promptSet.comparison || [],
                                          accuracy: newPrompts,
                                          brandBattle: promptSet.brandBattle,
                                        },
                                        token
                                      ).catch(error => {
                                        console.error("Failed to save prompt:", error);
                                        // Revert on error
                                        setPromptSet(promptSet);
                                      });
                                    }
                                    
                                    setEditingPromptType(null);
                                    setEditingPromptIndex(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            ) : (
                              prompt
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="battle" className="space-y-2 mt-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Brand Battle Prompts</div>
                      <div className="space-y-2">
                        {promptSet.brandBattle.map((prompt, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors animate-in slide-in-from-bottom-2 cursor-pointer"
                            style={{ animationDelay: `${index * 30}ms` }}
                            onClick={() => {
                              setEditingPromptType("battle");
                              setEditingPromptIndex(index);
                              setEditingPromptValue(prompt);
                            }}
                          >
                            {editingPromptType === "battle" && editingPromptIndex === index ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingPromptValue}
                                  onChange={(e) => setEditingPromptValue(e.target.value)}
                                  autoFocus
                                  className="min-h-[60px] resize-none"
                                  onBlur={() => {
                                    // Save on blur
                                    const newPrompts = [...promptSet.brandBattle];
                                    newPrompts[index] = editingPromptValue;
                                    
                                    // Update promptSet
                                    const updatedPromptSet = {
                                      ...promptSet,
                                      brandBattle: newPrompts
                                    };
                                    setPromptSet(updatedPromptSet);
                                    
                                    // Save to backend
                                    if (selectedCompany && token) {
                                      updatePromptSet(
                                        selectedCompany.id,
                                        {
                                          spontaneous: promptSet.spontaneous,
                                          direct: promptSet.direct,
                                          comparison: promptSet.comparison || [],
                                          accuracy: promptSet.accuracy,
                                          brandBattle: newPrompts,
                                        },
                                        token
                                      ).catch(error => {
                                        console.error("Failed to save prompt:", error);
                                        // Revert on error
                                        setPromptSet(promptSet);
                                      });
                                    }
                                    
                                    setEditingPromptType(null);
                                    setEditingPromptIndex(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            ) : (
                              prompt
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Loading state for prompts */}
            {loadingPrompts && (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-sm text-gray-600">Loading prompts...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Company Metadata */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-white">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                  <div className="group cursor-default">
                    <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1 group-hover:text-gray-700 transition-colors">Company ID</p>
                    <p className="text-gray-700 font-mono text-xs bg-gray-100 px-2 py-1 rounded group-hover:bg-gray-200 transition-colors">{selectedCompany.id}</p>
                  </div>
                  <div className="group cursor-default">
                    <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1 group-hover:text-gray-700 transition-colors">Created</p>
                    <p className="text-gray-700 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      <span className="group-hover:text-gray-900 transition-colors">{formatDate(selectedCompany.createdAt)}</span>
                    </p>
                  </div>
                  <div className="group cursor-default">
                    <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1 group-hover:text-gray-700 transition-colors">Last Updated</p>
                    <p className="text-gray-700 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 text-gray-400 group-hover:text-gray-600 group-hover:rotate-180 transition-all duration-500" />
                      <span className="group-hover:text-gray-900 transition-colors">{formatDate(selectedCompany.updatedAt)}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Modals */}
        {/* Key Brand Attributes Modal */}
        <Dialog open={editAttributesOpen} onOpenChange={setEditAttributesOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Edit Key Brand Attributes</DialogTitle>
              <DialogDescription>
                Add, edit, or remove brand attributes for {selectedCompany?.brandName}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {editingAttributes.map((attribute, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={attribute}
                    onChange={(e) => {
                      const newAttributes = [...editingAttributes];
                      newAttributes[index] = e.target.value;
                      setEditingAttributes(newAttributes);
                    }}
                    placeholder="Enter attribute"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingAttributes(editingAttributes.filter((_, i) => i !== index));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingAttributes([...editingAttributes, ""])}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Attribute
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditAttributesOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedCompany || !token) return;

                  setSavingAttributes(true);
                  try {
                    // Filter out empty attributes
                    const filteredAttributes = editingAttributes.filter(attr => attr.trim() !== "");

                    // Update via API
                    const updatedCard = await updateIdentityCard(
                      selectedCompany.id,
                      { keyBrandAttributes: filteredAttributes },
                      token
                    );

                    // Update local state
                    setSelectedCompany(updatedCard);
                    setEditAttributesOpen(false);
                  } catch (error) {
                    console.error("Failed to save attributes:", error);
                    alert("Failed to save attributes. Please try again.");
                  } finally {
                    setSavingAttributes(false);
                  }
                }}
                disabled={savingAttributes}
              >
                {savingAttributes ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Competitors Modal */}
        <Dialog open={editCompetitorsOpen} onOpenChange={setEditCompetitorsOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Edit Competitors</DialogTitle>
              <DialogDescription>
                Add, edit, or remove competitors for {selectedCompany?.brandName}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {editingCompetitors.map((competitor, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={competitor}
                    onChange={(e) => {
                      const newCompetitors = [...editingCompetitors];
                      newCompetitors[index] = e.target.value;
                      setEditingCompetitors(newCompetitors);
                    }}
                    placeholder="Enter competitor name"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingCompetitors(editingCompetitors.filter((_, i) => i !== index));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingCompetitors([...editingCompetitors, ""])}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Competitor
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditCompetitorsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedCompany || !token) return;

                  setSavingCompetitors(true);
                  try {
                    // Filter out empty competitors
                    const filteredCompetitors = editingCompetitors.filter(comp => comp.trim() !== "");

                    // Update via API
                    const updatedCard = await updateIdentityCard(
                      selectedCompany.id,
                      { competitors: filteredCompetitors },
                      token
                    );

                    // Update local state
                    setSelectedCompany(updatedCard);
                    setEditCompetitorsOpen(false);
                  } catch (error) {
                    console.error("Failed to save competitors:", error);
                    alert("Failed to save competitors. Please try again.");
                  } finally {
                    setSavingCompetitors(false);
                  }
                }}
                disabled={savingCompetitors}
              >
                {savingCompetitors ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
