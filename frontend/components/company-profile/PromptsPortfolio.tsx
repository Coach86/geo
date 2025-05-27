import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Eye, MessageSquare, CheckCircle, Swords } from 'lucide-react';
import { PromptSet, updatePromptSet } from "@/lib/auth-api";

interface PromptsPortfolioProps {
  promptSet: PromptSet;
  companyId: string;
  token: string | null;
  onUpdate: (updatedPromptSet: PromptSet) => void;
}

export function PromptsPortfolio({ promptSet, companyId, token, onUpdate }: PromptsPortfolioProps) {
  const [editingPromptType, setEditingPromptType] = useState<string | null>(null);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [editingPromptValue, setEditingPromptValue] = useState("");

  const handlePromptEdit = async (type: string, index: number, newValue: string) => {
    const promptsCopy = { ...promptSet };
    
    switch (type) {
      case "spontaneous":
        promptsCopy.spontaneous[index] = newValue;
        break;
      case "direct":
        promptsCopy.direct[index] = newValue;
        break;
      case "accuracy":
        promptsCopy.accuracy[index] = newValue;
        break;
      case "battle":
        promptsCopy.brandBattle[index] = newValue;
        break;
    }

    onUpdate(promptsCopy);

    if (!token) {
      console.error("No token available for saving prompts");
      return;
    }

    try {
      await updatePromptSet(
        companyId,
        {
          spontaneous: promptsCopy.spontaneous,
          direct: promptsCopy.direct,
          comparison: promptsCopy.comparison || [],
          accuracy: promptsCopy.accuracy,
          brandBattle: promptsCopy.brandBattle,
        },
        token
      );
    } catch (error) {
      console.error("Failed to save prompt:", error);
      onUpdate(promptSet);
    }
  };

  const renderPrompts = (prompts: string[], type: string) => (
    <div className="space-y-2">
      {prompts.map((prompt, index) => (
        <div
          key={index}
          className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors animate-in slide-in-from-bottom-2 cursor-pointer"
          style={{ animationDelay: `${index * 30}ms` }}
          onClick={() => {
            setEditingPromptType(type);
            setEditingPromptIndex(index);
            setEditingPromptValue(prompt);
          }}
        >
          {editingPromptType === type && editingPromptIndex === index ? (
            <div className="space-y-2">
              <Textarea
                value={editingPromptValue}
                onChange={(e) => setEditingPromptValue(e.target.value)}
                autoFocus
                className="min-h-[60px] resize-none"
                onBlur={() => {
                  handlePromptEdit(type, index, editingPromptValue);
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
  );

  return (
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
          <TabsList className="grid w-full grid-cols-4 mb-4">
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
            {renderPrompts(promptSet.spontaneous, "spontaneous")}
          </TabsContent>

          <TabsContent value="direct" className="space-y-2 mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Direct Sentiment Prompts</div>
            {renderPrompts(promptSet.direct, "direct")}
          </TabsContent>

          <TabsContent value="accuracy" className="space-y-2 mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Compliance Evaluation Prompts</div>
            {renderPrompts(promptSet.accuracy, "accuracy")}
          </TabsContent>

          <TabsContent value="battle" className="space-y-2 mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Brand Battle Prompts</div>
            {renderPrompts(promptSet.brandBattle, "battle")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}