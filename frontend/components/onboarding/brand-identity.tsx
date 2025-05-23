"use client"

import { useState, useEffect } from "react"
import { useOnboarding } from "@/providers/onboarding-provider"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Check, Users, Tag } from "lucide-react"

export default function BrandIdentity() {
  const { formData, updateFormData } = useOnboarding()
  const [attributeInput, setAttributeInput] = useState("")
  const [competitorInput, setCompetitorInput] = useState("")
  const [editableValues, setEditableValues] = useState<{ [key: string]: string }>({})
  const [editingStates, setEditingStates] = useState<{ [key: string]: boolean }>({})

  // Auto-select the first 3 suggested attributes on initial load
  useEffect(() => {
    if (formData.attributes.length === 0 && suggestedAttributes.length > 0) {
      const attributesToAdd = suggestedAttributes.slice(0, 3)
      updateFormData({
        attributes: attributesToAdd,
      })
    }
  }, [])

  // Suggested attributes - phrases selected by default
  const suggestedAttributes = [
    "Innovative and forward-thinking",
    "Reliable and trustworthy",
    "Secure and privacy-focused",
    "User-friendly and accessible",
    "Affordable without compromising quality",
    "Premium and high-end positioning",
    "Sustainable and environmentally conscious",
    "Efficient and performance-oriented",
    "Scalable for growing businesses",
    "Customizable to specific needs",
  ].filter((attr) => !formData.attributes.includes(attr))

  // Handle adding a new attribute
  const handleAddAttribute = (attribute: string) => {
    if (attribute.trim() && !formData.attributes.includes(attribute.trim()) && formData.attributes.length < 5) {
      updateFormData({
        attributes: [...formData.attributes, attribute.trim()],
      })
      setAttributeInput("")
    }
  }

  // Handle removing an attribute
  const handleRemoveAttribute = (attribute: string) => {
    updateFormData({
      attributes: formData.attributes.filter((attr) => attr !== attribute),
    })
  }

  // Handle adding a new competitor
  const handleAddCompetitor = (competitor: string) => {
    const selectedCount = formData.competitors.filter((comp) => comp.selected).length

    if (competitor.trim() && !formData.competitors.some((c) => c.name === competitor.trim())) {
      // Si on a déjà 5 compétiteurs sélectionnés, on ajoute le nouveau mais non sélectionné
      const isSelected = selectedCount < 5

      updateFormData({
        competitors: [...formData.competitors, { name: competitor.trim(), selected: isSelected }],
      })
      setCompetitorInput("")
    }
  }

  // Handle toggling a competitor
  const handleToggleCompetitor = (index: number) => {
    const updatedCompetitors = [...formData.competitors]
    const selectedCount = updatedCompetitors.filter((comp) => comp.selected).length

    // Si on essaie de sélectionner un compétiteur et qu'on a déjà 5 sélectionnés, on ne fait rien
    if (!updatedCompetitors[index].selected && selectedCount >= 5) {
      return
    }

    updatedCompetitors[index].selected = !updatedCompetitors[index].selected
    updateFormData({ competitors: updatedCompetitors })
  }

  const handleEditAttribute = (attribute: string) => {
    setEditableValues((prev) => ({ ...prev, [attribute]: attribute }))
    setEditingStates((prev) => ({ ...prev, [attribute]: true }))
  }

  const handleCancelEdit = (attribute: string) => {
    setEditingStates((prev) => ({ ...prev, [attribute]: false }))
  }

  const handleConfirmEdit = (originalAttribute: string, newAttributeValue: string) => {
    handleAddAttribute(newAttributeValue)
    setEditingStates((prev) => ({ ...prev, [originalAttribute]: false }))
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
              <Badge className="bg-accent-100 text-accent-700 ml-2">{formData.attributes.length}/5</Badge>
            </div>
            <p className="text-sm text-gray-500 mb-4">Feel free to edit our suggestions</p>

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
                  disabled={formData.attributes.length >= 5}
                />
                {attributeInput && (
                  <button
                    onClick={() => handleAddAttribute(attributeInput)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={formData.attributes.length >= 5}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>
              {formData.attributes.length >= 5 && (
                <p className="text-xs text-amber-600 mt-1">
                  You have reached the maximum of 5 attributes. Remove one to add a new one.
                </p>
              )}
            </div>

            {/* Liste d'attributs avec le nouveau style UX */}
            <div className="space-y-3">
              {[...formData.attributes, ...suggestedAttributes.slice(0, 5 - formData.attributes.length)].map(
                (attribute, index) => {
                  const isSelected = formData.attributes.includes(attribute)
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
                      onClick={() => handleEditAttribute(attribute)}
                    >
                      <span className="text-sm text-mono-800 cursor-pointer">{attribute}</span>
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
                {formData.competitors.filter((comp) => comp.selected).length}/5
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mb-4">Select up to 5 main competitors</p>

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
                    formData.competitors.filter((comp) => comp.selected).length >= 5 && competitorInput.trim() === ""
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
              {formData.competitors.filter((comp) => comp.selected).length >= 5 && (
                <p className="text-xs text-amber-600 mt-1">
                  You have reached the maximum of 5 competitors. Deselect one to add a new one.
                </p>
              )}
            </div>

            {/* Competitor cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formData.competitors.map((competitor, index) => (
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
