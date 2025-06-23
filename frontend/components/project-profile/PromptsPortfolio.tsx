import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, MessageSquare, CheckCircle, Swords, Plus, AlertCircle } from "lucide-react";
import { PromptSet, updatePromptSet, getUserProfile } from "@/lib/auth-api";
import { toast } from "sonner";

interface PromptsPortfolioProps {
  promptSet: PromptSet;
  projectId: string;
  token: string | null;
  onUpdate: (promptSet: PromptSet) => void;
}

export function PromptsPortfolio({
  promptSet,
  projectId,
  token,
  onUpdate,
}: PromptsPortfolioProps) {
  const router = useRouter();
  const [editingPromptType, setEditingPromptType] = useState<string | null>(
    null
  );
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(
    null
  );
  const [editingPromptValue, setEditingPromptValue] = useState("");
  const [addingPromptType, setAddingPromptType] = useState<string | null>(null);
  const [newPromptValue, setNewPromptValue] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Fetch user profile to get prompt limits
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!token) return;

      setIsLoadingProfile(true);
      try {
        const profile = await getUserProfile(token);
        setUserProfile(profile);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [token]);

  // Check if user can add more prompts for a specific type
  const canAddMorePrompts = (type: string): boolean => {
    if (!userProfile) return false;

    // Only limit visibility prompts
    if (type === "visibility") {
      const currentVisibilityCount = promptSet.visibility.length;
      const maxVisibilityPrompts = userProfile.planSettings?.maxVisibilityPrompts || 12;
      return currentVisibilityCount < maxVisibilityPrompts;
    }

    // Other prompt types are not limited
    return true;
  };

  // Handle adding a new prompt
  const handleAddPrompt = (type: string) => {
    // Check if it's a visibility prompt and if limit would be exceeded
    if (type === "visibility" && !canAddMorePrompts(type)) {
      // Redirect to upgrade plan
      router.push("/update-plan");
      return;
    }

    setAddingPromptType(type);
    setNewPromptValue("");
  };

  // Save new prompt
  const handleSaveNewPrompt = async (type: string) => {
    if (!newPromptValue.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    const promptsCopy = { ...promptSet };

    switch (type) {
      case "visibility":
        promptsCopy.visibility = [...promptsCopy.visibility, newPromptValue.trim()];
        break;
      case "sentiment":
        promptsCopy.sentiment = [...promptsCopy.sentiment, newPromptValue.trim()];
        break;
      case "alignment":
        promptsCopy.alignment = [...promptsCopy.alignment, newPromptValue.trim()];
        break;
      case "competition":
        promptsCopy.competition = [...promptsCopy.competition, newPromptValue.trim()];
        break;
    }

    onUpdate(promptsCopy);

    if (!token) {
      console.error("No token available for saving prompts");
      return;
    }

    try {
      await updatePromptSet(
        projectId,
        {
          visibility: promptsCopy.visibility,
          sentiment: promptsCopy.sentiment,
          alignment: promptsCopy.alignment,
          competition: promptsCopy.competition,
        },
        token
      );
      toast.success("Prompt added successfully");
      setAddingPromptType(null);
      setNewPromptValue("");
    } catch (error) {
      console.error("Failed to save prompt:", error);
      toast.error("Failed to add prompt");
      onUpdate(promptSet);
    }
  };

  const handlePromptEdit = async (
    type: string,
    index: number,
    newValue: string
  ) => {
    const promptsCopy = { ...promptSet };

    switch (type) {
      case "visibility":
        promptsCopy.visibility[index] = newValue;
        break;
      case "sentiment":
        promptsCopy.sentiment[index] = newValue;
        break;
      case "alignment":
        promptsCopy.alignment[index] = newValue;
        break;
      case "competition":
        promptsCopy.competition[index] = newValue;
        break;
    }

    onUpdate(promptsCopy);

    if (!token) {
      console.error("No token available for saving prompts");
      return;
    }

    try {
      await updatePromptSet(
        projectId,
        {
          visibility: promptsCopy.visibility,
          sentiment: promptsCopy.sentiment,
          alignment: promptsCopy.alignment,
          competition: promptsCopy.competition,
        },
        token
      );
    } catch (error) {
      console.error("Failed to save prompt:", error);
      onUpdate(promptSet);
    }
  };

  const renderPrompts = (prompts: string[], type: string) => {
    const canAdd = canAddMorePrompts(type);
    const isAtLimit = type === "visibility" && !canAdd;

    return (
      <div className="space-y-2">
        {prompts.map((prompt, index) => (
          <div
            key={index}
            className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
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

        {/* Add new prompt section - ONLY for visibility prompts */}
        {type === "visibility" && (
          <>
            {addingPromptType === type ? (
              <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="space-y-2">
                  <Textarea
                    value={newPromptValue}
                    onChange={(e) => setNewPromptValue(e.target.value)}
                    placeholder="Enter your new visibility prompt..."
                    autoFocus
                    className="min-h-[60px] resize-none border-blue-300 focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSaveNewPrompt(type)}
                      size="sm"
                      disabled={!newPromptValue.trim()}
                    >
                      Save Prompt
                    </Button>
                    <Button
                      onClick={() => {
                        setAddingPromptType(null);
                        setNewPromptValue("");
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={() => handleAddPrompt(type)}
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  disabled={isLoadingProfile}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Visibility Prompt
                  {isAtLimit && <span className="text-xs text-orange-600 ml-1">(Upgrade required)</span>}
                </Button>

                {userProfile && (
                  <div className="text-xs text-gray-500 text-center">
                    {prompts.length} / {userProfile.planSettings?.maxVisibilityPrompts || 12} visibility prompts used
                  </div>
                )}

                {isAtLimit && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-xs text-orange-700">
                      You've reached your visibility prompt limit. Click "Add Visibility Prompt" to upgrade your plan.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

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
        <Tabs defaultValue="visibility" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="visibility" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Visibility ({promptSet.visibility.length})
            </TabsTrigger>
            <TabsTrigger value="sentiment" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Sentiment ({promptSet.sentiment.length})
            </TabsTrigger>
            <TabsTrigger value="alignment" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Alignment ({promptSet.alignment.length})
            </TabsTrigger>
            <TabsTrigger value="competition" className="text-xs">
              <Swords className="h-3 w-3 mr-1" />
              Competition ({promptSet.competition.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visibility" className="space-y-2 mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Visibility Prompts
            </div>
            {renderPrompts(promptSet.visibility, "visibility")}
          </TabsContent>

          <TabsContent value="sentiment" className="space-y-2 mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Sentiment Prompts
            </div>
            {renderPrompts(promptSet.sentiment, "sentiment")}
          </TabsContent>

          <TabsContent value="alignment" className="space-y-2 mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Alignment Evaluation Prompts
            </div>
            {renderPrompts(promptSet.alignment, "alignment")}
          </TabsContent>

          <TabsContent value="competition" className="space-y-2 mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Competition Prompts
            </div>
            {renderPrompts(promptSet.competition, "competition")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
