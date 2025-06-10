"use client"

import { useState, useEffect } from "react"
import { getOnboardingData, updateOnboardingData } from "@/lib/onboarding-storage"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Check, Users, Tag } from "lucide-react"

export default function BrandIdentity() {
  const [attributeInput, setAttributeInput] = useState("")
  const [competitorInput, setCompetitorInput] = useState("")
  const [editableValues, setEditableValues] = useState<{ [key: string]: string }>({})
  const [editingStates, setEditingStates] = useState<{ [key: string]: boolean }>({})
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0) // Force re-render after localStorage updates
  
  // Get form data from localStorage
  const formData = getOnboardingData()
  
  // Get analyzed data from the identity card
  const analyzedAttributes = formData.brand?.analyzedData?.keyBrandAttributes || []
  const analyzedCompetitors = formData.brand?.analyzedData?.competitors || []
  // Get current attributes and competitors
  const attributes = formData.brand?.attributes || []
  const competitors = formData.brand?.competitors || []
  
  // Debug logging
  console.log('Brand Identity - FormData:', formData)
  console.log('Brand Identity - Analyzed Attributes:', analyzedAttributes)
  console.log('Brand Identity - Analyzed Competitors:', analyzedCompetitors)
  console.log('Brand Identity - Current Attributes:', attributes)
  console.log('Brand Identity - Current Competitors:', competitors)
  console.log('Brand Identity - Has Auto Populated:', hasAutoPopulated)
  
  // Auto-populate attributes and competitors from analysis on initial load
  useEffect(() => {
    console.log('[BrandIdentity useEffect] Running auto-populate check')
    console.log('[BrandIdentity useEffect] attributes:', attributes)
    console.log('[BrandIdentity useEffect] competitors:', competitors)
    console.log('[BrandIdentity useEffect] analyzedAttributes:', analyzedAttributes)
    console.log('[BrandIdentity useEffect] analyzedCompetitors:', analyzedCompetitors)
    
    // Only auto-populate once
    if (hasAutoPopulated) {
      console.log('[BrandIdentity useEffect] Already auto-populated, skipping')
      return
    }
    
    // Check if we have analyzed data and haven't already populated from it
    const hasAnalyzedData = analyzedAttributes.length > 0 || analyzedCompetitors.length > 0
    const hasNoCompetitors = competitors.length === 0
    
    // IMPORTANT: Only populate if we truly have EMPTY arrays, not if user has modified them
    if (hasAnalyzedData && (attributes.length === 0 || hasNoCompetitors)) {
      const updates: any = {}
      
      // Populate attributes from analysis ONLY if completely empty
      if (analyzedAttributes.length > 0 && attributes.length === 0) {
        const attributesToAdd = analyzedAttributes.slice(0, 5) // Max 5 attributes
        updates.attributes = attributesToAdd
        console.log('[BrandIdentity useEffect] Will populate attributes:', attributesToAdd)
      }
      
      // Populate competitors from analysis ONLY if completely empty
      if (analyzedCompetitors.length > 0 && hasNoCompetitors) {
        const competitorsToAdd = analyzedCompetitors.slice(0, 5).map((competitor, index) => ({
          name: competitor,
          selected: index < 5, // Select first 5
        }))
        updates.competitors = competitorsToAdd
        console.log('[BrandIdentity useEffect] Will populate competitors:', competitorsToAdd)
      }
      
      if (Object.keys(updates).length > 0) {
        console.log('[BrandIdentity useEffect] Populating from analyzed data:', updates)
        // Update localStorage directly
        updateOnboardingData({
          brand: {
            ...formData.brand,
            ...updates
          }
        })
        setHasAutoPopulated(true)
      } else {
        console.log('[BrandIdentity useEffect] No updates needed, user has already modified data')
      }
    } else {
      console.log('[BrandIdentity useEffect] Skipping auto-populate - either no analyzed data or user has data')
    }
  }, [analyzedAttributes.length, analyzedCompetitors.length, attributes.length, competitors.length, hasAutoPopulated, refreshKey])

  // Only show analyzed attributes as suggestions (no hardcoded defaults)
  const displayAttributes = analyzedAttributes
    .filter((attr: string) => !attributes.includes(attr))
    .slice(0, 5 - attributes.length)

  // Handle adding a new attribute
  const handleAddAttribute = (attribute: string) => {
    if (attribute.trim() && !attributes.includes(attribute.trim()) && attributes.length < 5) {
      const newAttributes = [...attributes, attribute.trim()]
      console.log('Brand Identity - Adding attribute:', attribute.trim())
      console.log('Brand Identity - New attributes list:', newAttributes)
      // Update localStorage directly
      updateOnboardingData({
        brand: {
          ...formData.brand,
          attributes: newAttributes,
        }
      })
      setAttributeInput("")
      // Force component to re-render with fresh data from localStorage
      setRefreshKey(prev => prev + 1)
    }
  }

  // Handle removing an attribute
  const handleRemoveAttribute = (attribute: string) => {
    const newAttributes = attributes.filter((attr: string) => attr !== attribute)
    console.log('Brand Identity - Removing attribute:', attribute)
    console.log('Brand Identity - New attributes list:', newAttributes)
    // Update localStorage directly
    updateOnboardingData({
      brand: {
        ...formData.brand,
        attributes: newAttributes,
      }
    })
    // Force component to re-render with fresh data from localStorage
    setRefreshKey(prev => prev + 1)
  }

  // Handle adding a new competitor
  const handleAddCompetitor = (competitor: string) => {
    const selectedCount = competitors.filter((comp: any) => comp.selected).length

    if (competitor.trim() && !competitors.some((c: any) => c.name === competitor.trim())) {
      // Si on a déjà 5 compétiteurs sélectionnés, on ajoute le nouveau mais non sélectionné
      const isSelected = selectedCount < 5
      const newCompetitors = [...competitors, { name: competitor.trim(), selected: isSelected }]
      console.log('Brand Identity - Adding competitor:', competitor.trim())
      console.log('Brand Identity - New competitors list:', newCompetitors)
      // Update localStorage directly
      updateOnboardingData({
        brand: {
          ...formData.brand,
          competitors: newCompetitors,
        }
      })
      setCompetitorInput("")
      // Force component to re-render with fresh data from localStorage
      setRefreshKey(prev => prev + 1)
    }
  }

  // Handle toggling a competitor
  const handleToggleCompetitor = (index: number) => {
    const updatedCompetitors = [...competitors]
    const selectedCount = updatedCompetitors.filter((comp: any) => comp.selected).length

    // Si on essaie de sélectionner un compétiteur et qu'on a déjà 5 sélectionnés, on ne fait rien
    if (!updatedCompetitors[index].selected && selectedCount >= 5) {
      return
    }

    updatedCompetitors[index].selected = !updatedCompetitors[index].selected
    console.log('Brand Identity - Toggling competitor:', updatedCompetitors[index].name)
    console.log('Brand Identity - Updated competitors:', updatedCompetitors)
    // Update localStorage directly
    updateOnboardingData({
      brand: {
        ...formData.brand,
        competitors: updatedCompetitors,
      }
    })
    // Force component to re-render with fresh data from localStorage
    setRefreshKey(prev => prev + 1)
  }

  const handleEditAttribute = (attribute: string) => {
    setEditableValues((prev) => ({ ...prev, [attribute]: attribute }))
    setEditingStates((prev) => ({ ...prev, [attribute]: true }))
  }

  const handleCancelEdit = (attribute: string) => {
    setEditingStates((prev) => ({ ...prev, [attribute]: false }))
    // Reset the editable value to the original
    setEditableValues((prev) => {
      const newValues = { ...prev }
      delete newValues[attribute]
      return newValues
    })
  }

  const handleConfirmEdit = (originalAttribute: string, newAttributeValue: string) => {
    // If the value hasn't changed, just exit edit mode
    if (originalAttribute === newAttributeValue.trim()) {
      setEditingStates((prev) => ({ ...prev, [originalAttribute]: false }))
      return
    }
    
    // Check if the new attribute already exists
    if (attributes.includes(newAttributeValue.trim()) && originalAttribute !== newAttributeValue.trim()) {
      console.log('Brand Identity - Attribute already exists:', newAttributeValue.trim())
      return
    }
    
    // Replace the original attribute with the new one
    const updatedAttributes = attributes.map((attr: string) => 
      attr === originalAttribute ? newAttributeValue.trim() : attr
    )
    
    console.log('Brand Identity - Editing attribute from:', originalAttribute, 'to:', newAttributeValue.trim())
    console.log('Brand Identity - Updated attributes:', updatedAttributes)
    
    console.log('[BrandIdentity] About to update localStorage with attributes:', updatedAttributes);
    // Update localStorage directly
    updateOnboardingData({
      brand: {
        ...formData.brand,
        attributes: updatedAttributes,
      }
    })
    console.log('[BrandIdentity] localStorage updated successfully');
    
    setEditingStates((prev) => ({ ...prev, [originalAttribute]: false }))
    // Clear the editable value for this attribute
    setEditableValues((prev) => {
      const newValues = { ...prev }
      delete newValues[originalAttribute]
      return newValues
    })
    
    // Force component to re-render with fresh data from localStorage
    setRefreshKey(prev => prev + 1)
  }

  const handleEditableValueChange = (attribute: string, value: string) => {
    setEditableValues((prev) => ({ ...prev, [attribute]: value }))
  }

  return (
    <div className="py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-accent-100 text-accent-500 mb-4">
          <Users className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-mono-900">Now, build your brand profile</h1>
        <p className="text-gray-600 max-w-md mx-auto">Help us understand your brand's key attributes and competitors</p>
      </div>

      <div className="space-y-10">
        {/* Brand Attributes */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-5 w-5 text-accent-600" />
              <h2 className="text-xl font-semibold text-mono-900">Brand Attributes</h2>
              <Badge className="bg-accent-100 text-accent-700 ml-2">{attributes.length}/5</Badge>
              {analyzedAttributes.length > 0 && (
                <Badge className="bg-secondary-100 text-secondary-700 ml-1">
                  AI Analyzed
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {analyzedAttributes.length > 0 
                ? "Based on your website analysis - feel free to edit or add more" 
                : "Feel free to edit our suggestions"
              }
            </p>

            <div className="mb-4">
              <div className="relative">
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
                  disabled={attributes.length >= 5}
                />
                {attributeInput && (
                  <button
                    onClick={() => handleAddAttribute(attributeInput)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={attributes.length >= 5}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>
              {attributes.length >= 5 && (
                <p className="text-xs text-amber-600 mt-1">
                  You have reached the maximum of 5 attributes. Remove one to add a new one.
                </p>
              )}
            </div>

            {/* Liste d'attributs avec le nouveau style UX */}
            <div className="space-y-3">
              {[...attributes, ...displayAttributes].map(
                (attribute, index) => {
                  const isSelected = attributes.includes(attribute)
                  const isEditing = editingStates[attribute] || false
                  const editableValue = editableValues[attribute] || attribute

                  return isEditing ? (
                    <div key={index} className="p-3 rounded-lg border border-accent-300 bg-accent-50">
                      <div className="flex items-center">
                        <Input
                          value={editableValue}
                          onChange={(e) => handleEditableValueChange(attribute, e.target.value)}
                          className="flex-1 h-9 text-sm input-focus"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleConfirmEdit(attribute, editableValue)
                            } else if (e.key === "Escape") {
                              handleCancelEdit(attribute)
                            }
                          }}
                        />
                        <div className="flex ml-2 space-x-1">
                          <button
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                            onClick={() => handleConfirmEdit(attribute, editableValue)}
                            aria-label={`Confirm ${editableValue}`}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                            onClick={() => handleCancelEdit(attribute)}
                            aria-label="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-accent-200 transition-colors"
                      onClick={() => {
                        // Only allow editing for already selected attributes
                        if (isSelected) {
                          handleEditAttribute(attribute)
                        }
                      }}
                    >
                      <span className={`text-sm text-mono-800 ${isSelected ? 'cursor-pointer' : ''}`}>{attribute}</span>
                      <div className="relative inline-block w-10 h-6 transition duration-200 ease-in-out">
                        <input
                          type="checkbox"
                          id={`toggle-${index}`}
                          className="opacity-0 w-0 h-0"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            isSelected ? handleRemoveAttribute(attribute) : handleAddAttribute(attribute)
                          }}
                        />
                        <label
                          htmlFor={`toggle-${index}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-200 ${
                            isSelected ? "bg-accent-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                              isSelected ? "transform translate-x-4" : ""
                            }`}
                          ></span>
                        </label>
                      </div>
                    </div>
                  )
                },
              )}
            </div>

            <p className="text-sm text-gray-500 mt-6">
              Brand attributes are the differentiating factors you want AI models to naturally highlight when describing
              your brand. Select up to 5 attributes.
            </p>
          </CardContent>
        </Card>

        {/* Competitor Selection */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-accent-600" />
              <h2 className="text-xl font-semibold text-mono-900">Competitor Selection</h2>
              <Badge className="bg-accent-100 text-accent-700 ml-2">
                {competitors.filter((comp: any) => comp.selected).length}/5
              </Badge>
              {analyzedCompetitors.length > 0 && (
                <Badge className="bg-secondary-100 text-secondary-700 ml-1">
                  AI Analyzed
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {analyzedCompetitors.length > 0 
                ? "Based on your website analysis - you can add, remove or modify these" 
                : "Select up to 5 main competitors"
              }
            </p>

            <div className="mb-4">
              <div className="relative">
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
                  disabled={
                    competitors.filter((comp: any) => comp.selected).length >= 5 && competitorInput.trim() === ""
                  }
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
              {competitors.filter((comp: any) => comp.selected).length >= 5 && (
                <p className="text-xs text-amber-600 mt-1">
                  You have reached the maximum of 5 competitors. Deselect one to add a new one.
                </p>
              )}
            </div>

            {/* Competitor cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {competitors.map((competitor: any, index: number) => (
                <Card
                  key={index}
                  className={`border ${
                    competitor.selected ? "border-accent-300 bg-accent-50" : "border-gray-200"
                  } cursor-pointer transition-all hover:shadow-sm`}
                  onClick={() => handleToggleCompetitor(index)}
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

            <p className="text-sm text-gray-500 mt-4">
              These are your most likely competitors based on how LLMs mention them. We'll use them for head-to-head
              comparisons in the final report. You can add or remove freely.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
