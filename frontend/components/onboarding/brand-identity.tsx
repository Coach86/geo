"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Check, Users, Tag, LineChart } from "lucide-react"

interface AttributeItem {
  id: string;
  value: string;
  selected: boolean;
}

interface CompetitorItem {
  id: string;
  name: string;
  selected: boolean;
}

interface Competitor {
  name: string;
  selected: boolean;
}

interface BrandIdentityProps {
  initialData?: {
    project?: {
      brandName: string;
      description: string;
      industry: string;
    };
    attributes: string[];
    competitors: Competitor[];
    analyzedData?: {
      keyBrandAttributes: string[];
      competitors: string[];
    };
  };
  onDataReady?: (data: {
    project: {
      brandName: string;
      description: string;
      industry: string;
    };
    attributes: string[];
    competitors: Competitor[]
  }) => void;
}

export default function BrandIdentity({ initialData, onDataReady }: BrandIdentityProps) {
  // Helper to generate unique IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Initialize attributes with selection state and IDs
  const initializeAttributes = (): AttributeItem[] => {
    const allAttributes: AttributeItem[] = [];
    const addedAttributes = new Set<string>();

    // If we have analyzed attributes, show them
    if (initialData?.analyzedData?.keyBrandAttributes && initialData.analyzedData.keyBrandAttributes.length > 0) {
      // Check if we have any saved selections
      const hasSavedSelections = initialData?.attributes && initialData.attributes.length > 0;

      initialData.analyzedData.keyBrandAttributes.forEach((attr, idx) => {
        if (!addedAttributes.has(attr)) {
          const isSelected = hasSavedSelections
            ? initialData.attributes?.includes(attr) || false
            : idx < 4;  // Select first 4 by default if no saved selections
          allAttributes.push({
            id: generateId(),
            value: attr,
            selected: isSelected
          });
          addedAttributes.add(attr);
        }
      });
    }

    // Add any manual attributes that aren't in analyzed data
    if (initialData?.attributes && initialData.attributes.length > 0) {
      initialData.attributes.forEach(attr => {
        if (!addedAttributes.has(attr)) {
          allAttributes.push({
            id: generateId(),
            value: attr,
            selected: true
          });
          addedAttributes.add(attr);
        }
      });
    }

    return allAttributes;
  };

  // Initialize competitors including analyzed data with IDs
  const initializeCompetitors = (): CompetitorItem[] => {
    const allCompetitors: CompetitorItem[] = [];
    const addedCompetitors = new Set<string>();

    // If we have analyzed competitors, show them
    if (initialData?.analyzedData?.competitors && initialData.analyzedData.competitors.length > 0) {
      // Check if we have any saved selections
      const hasSavedSelections = initialData?.competitors && initialData.competitors.length > 0;

      initialData.analyzedData.competitors.forEach((comp, index) => {
        if (!addedCompetitors.has(comp)) {
          let isSelected: boolean;

          if (hasSavedSelections) {
            // If we have saved selections, check if this competitor is selected
            isSelected = initialData.competitors?.some(c => c.name === comp && c.selected) || false;
          } else {
            // If no saved selections, select first 3 by default
            isSelected = index < 3;
          }

          allCompetitors.push({
            id: generateId(),
            name: comp,
            selected: isSelected
          });
          addedCompetitors.add(comp);
        }
      });
    }

    // Add any manual competitors that aren't in analyzed data
    if (initialData?.competitors && initialData.competitors.length > 0) {
      initialData.competitors.forEach(comp => {
        if (!addedCompetitors.has(comp.name)) {
          allCompetitors.push({
            id: generateId(),
            ...comp
          });
          addedCompetitors.add(comp.name);
        }
      });
    }

    return allCompetitors;
  };

  // Local state - brand profile
  const [brandName, setBrandName] = useState(initialData?.project?.brandName || "");
  const [description, setDescription] = useState(initialData?.project?.description || "");
  const [industry, setIndustry] = useState(initialData?.project?.industry || "");

  // Local state - attributes and competitors
  const [attributeItems, setAttributeItems] = useState<AttributeItem[]>(initializeAttributes());
  const [competitorItems, setCompetitorItems] = useState<CompetitorItem[]>(initializeCompetitors());

  // UI state
  const [attributeInput, setAttributeInput] = useState("")
  const [competitorInput, setCompetitorInput] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editableValue, setEditableValue] = useState<string>("")

  // Get analyzed data for reference
  const analyzedAttributes = initialData?.analyzedData?.keyBrandAttributes || []
  const analyzedCompetitors = initialData?.analyzedData?.competitors || []

  // Notify parent when data changes (for validation purposes)
  useEffect(() => {
    if (onDataReady) {
      // Only send selected attributes as strings
      const selectedAttributes = attributeItems
        .filter(item => item.selected)
        .map(item => item.value);

      // Convert back to expected format for competitors
      const competitors = competitorItems.map(item => ({
        name: item.name,
        selected: item.selected
      }));

      onDataReady({
        project: {
          brandName,
          description,
          industry,
        },
        attributes: selectedAttributes,
        competitors
      });
    }
  }, [brandName, description, industry, attributeItems, competitorItems, onDataReady]);

  // Get count of selected attributes
  const selectedAttributesCount = attributeItems.filter(item => item.selected).length;

  // Handle adding a new attribute
  const handleAddAttribute = (attribute: string) => {
    const trimmed = attribute.trim()
    if (!trimmed || selectedAttributesCount >= 5) {
      return
    }

    // Check if already exists
    const existing = attributeItems.find(item => item.value === trimmed);
    if (existing) {
      // If it exists but is not selected, select it
      if (!existing.selected) {
        setAttributeItems(attributeItems.map(item =>
          item.id === existing.id ? { ...item, selected: true } : item
        ));
      }
      return;
    }

    // Add as new attribute at the end
    setAttributeItems([...attributeItems, {
      id: generateId(),
      value: trimmed,
      selected: true
    }]);
    setAttributeInput("");
  }

  // Handle toggling an attribute by ID
  const handleToggleAttribute = (id: string) => {
    const selectedCount = attributeItems.filter(item => item.selected).length;
    const targetItem = attributeItems.find(item => item.id === id);

    // If trying to select and already have 5, return
    if (targetItem && !targetItem.selected && selectedCount >= 5) {
      return;
    }

    setAttributeItems(attributeItems.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  }

  // Handle editing an attribute by ID
  const handleEditAttribute = (id: string, newValue: string) => {
    const trimmed = newValue.trim()
    if (!trimmed) return

    // Check for duplicates (excluding current item)
    const isDuplicate = attributeItems.some(item =>
      item.id !== id && item.value === trimmed
    )

    if (isDuplicate) {
      console.log('Brand Identity - Duplicate attribute detected:', trimmed)
      return
    }

    // Update the attribute value
    setAttributeItems(attributeItems.map(item =>
      item.id === id ? { ...item, value: trimmed } : item
    ));
  }

  // Handle adding a new competitor
  const handleAddCompetitor = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    // Check if already exists
    if (competitorItems.some(c => c.name === trimmed)) {
      return
    }

    // Count selected
    const selectedCount = competitorItems.filter(c => c.selected).length
    const newCompetitor = {
      id: generateId(),
      name: trimmed,
      selected: selectedCount < 5
    }

    setCompetitorItems([...competitorItems, newCompetitor]);
    setCompetitorInput("");
  }

  // Handle toggling a competitor by ID
  const handleToggleCompetitor = (id: string) => {
    const selectedCount = competitorItems.filter(c => c.selected).length
    const targetCompetitor = competitorItems.find(c => c.id === id)

    // If trying to select and already have 5, return
    if (targetCompetitor && !targetCompetitor.selected && selectedCount >= 5) {
      return
    }

    setCompetitorItems(competitorItems.map(c =>
      c.id === id ? { ...c, selected: !c.selected } : c
    ));
  }

  return (
    <div className="py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-mono-900">Configure your project parameters</h1>
      </div>

      <div className="space-y-10">
        {/* Brand Profile */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="mb-4">
              <Badge className="bg-accent-100 text-accent-500 hover:bg-accent-200">
                <LineChart className="h-3 w-3 mr-1" />
                Brand profile
              </Badge>
            </div>

            <div>
              <label
                htmlFor="brandName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Brand's name
              </label>
              <Input
                id="brandName"
                placeholder="Brand name"
                className="h-10 input-focus"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Short description
              </label>
              <Textarea
                id="description"
                placeholder="Describe your project in a few sentences"
                className="min-h-[80px] resize-none input-focus"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="industry"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Your industry/sector
              </label>
              <Input
                id="industry"
                placeholder="HR tech, Fintech, CRM..."
                className="h-10 input-focus"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Brand Attributes */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="mb-4">
              <Badge className="bg-accent-100 text-accent-500 hover:bg-accent-200">
                <Tag className="h-3 w-3 mr-1" />
                Brand Alignment properties
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {analyzedAttributes.length > 0
                ? "Edit your main properties to verify that AI accurately portrays your key differentiators, tone, and positioning"
                : "Select up to 5 key brand attributes"
              }
            </p>

            {/* List of attributes */}
            <div className="space-y-3">
              {attributeItems.map((item) => (
                <div key={item.id} className="group">
                  {editingId === item.id ? (
                    <div className="p-3 rounded-lg border border-accent-300 bg-accent-50">
                      <div className="flex items-center">
                        <Input
                          value={editableValue}
                          onChange={(e) => setEditableValue(e.target.value)}
                          className="flex-1 h-9 text-sm input-focus"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleEditAttribute(item.id, editableValue)
                              setEditingId(null)
                              setEditableValue("")
                            } else if (e.key === "Escape") {
                              setEditingId(null)
                              setEditableValue("")
                            }
                          }}
                        />
                        <div className="flex ml-2 space-x-1">
                          <button
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                            onClick={() => {
                              handleEditAttribute(item.id, editableValue)
                              setEditingId(null)
                              setEditableValue("")
                            }}
                            aria-label="Confirm edit"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                            onClick={() => {
                              setEditingId(null)
                              setEditableValue("")
                            }}
                            aria-label="Cancel edit"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        item.selected
                          ? "border-accent-300 bg-accent-50"
                          : "border-gray-200 hover:border-accent-200"
                      }`}
                    >
                      <span
                        className="text-sm text-mono-800 cursor-pointer hover:text-accent-600 flex-1"
                        onClick={() => {
                          if (item.selected) {
                            setEditingId(item.id)
                            setEditableValue(item.value)
                          } else {
                            handleToggleAttribute(item.id)
                          }
                        }}
                      >
                        {item.value}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-sm border flex items-center justify-center cursor-pointer transition-colors ${
                          item.selected
                            ? "bg-accent-500 border-accent-500 hover:bg-accent-600"
                            : "border-gray-300 hover:border-accent-400"
                        }`}
                        onClick={() => handleToggleAttribute(item.id)}
                      >
                        {item.selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  id="attribute-input"
                  placeholder="Ex: Innovative and forward-thinking"
                  value={attributeInput}
                  onChange={(e) => setAttributeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddAttribute(attributeInput)
                    }
                  }}
                  className="pr-10 input-focus"
                  disabled={selectedAttributesCount >= 5}
                />
                {attributeInput && (
                  <button
                    onClick={() => handleAddAttribute(attributeInput)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={selectedAttributesCount >= 5}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>
              <Badge className="bg-accent-100 text-accent-700">{selectedAttributesCount}/5</Badge>
            </div>
            <div>
              {selectedAttributesCount >= 5 && (
                <p className="text-xs text-amber-600 mt-1">
                  You have reached the maximum of 5 attributes. Deselect one to add a new one.
                </p>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-6">
              Protect your revenue with strong AI brand credibility.
            </p>
          </CardContent>
        </Card>

        {/* Competitor Selection */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="mb-4">
              <Badge className="bg-accent-100 text-accent-500 hover:bg-accent-200">
                <Users className="h-3 w-3 mr-1" />
                Top Competitor Selection
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Watch your closest competitors to track their visibility, to understand their strategies, and to capture opportunities

            </p>

            {/* Competitor cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {competitorItems.map((competitor) => (
                <Card
                  key={competitor.id}
                  className={`border ${
                    competitor.selected ? "border-accent-300 bg-accent-50" : "border-gray-200"
                  } cursor-pointer transition-all hover:shadow-sm`}
                  onClick={() => handleToggleCompetitor(competitor.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center ${
                          competitor.selected ? "bg-accent-100 text-accent-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {competitor.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{competitor.name}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-sm border flex items-center justify-center ${
                        competitor.selected ? "bg-accent-500 border-accent-500" : "border-gray-300"
                      }`}
                    >
                      {competitor.selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="Add a competitor"
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddCompetitor(competitorInput)
                    }
                  }}
                  className="pr-10 input-focus"
                />
                {competitorInput && (
                  <button
                    onClick={() => handleAddCompetitor(competitorInput)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>
              <Badge className="bg-accent-100 text-accent-700">
                {competitorItems.filter(c => c.selected).length}/5
              </Badge>
            </div>
            <div>
              {competitorItems.filter(c => c.selected).length >= 5 && (
                <p className="text-xs text-amber-600 mt-1">
                  You have reached the maximum of 5 competitors. Deselect one to add a new one.
                </p>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Win AI Share of Voice.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
