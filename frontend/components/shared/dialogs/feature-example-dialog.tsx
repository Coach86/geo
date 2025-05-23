"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Info, X } from "lucide-react"

export type FeatureExample = {
  id: string
  name: string
  description: string
  longDescription: string
  examples: {
    title: string
    description: string
    image: string
  }[]
}

const featureExamples: FeatureExample[] = [
  {
    id: "pulse",
    name: "Pulse",
    description: "How often AIs mention your brand",
    longDescription:
      "Pulse measures the percentage of times your brand is mentioned by AI when asked about your industry. A higher score indicates better visibility across AI models.",
    examples: [
      {
        title: "Brand Visibility Overview",
        description: "See your overall visibility score across all tested AI models, with a breakdown by model.",
        image: "/features/pulse-example-1.png",
      },
      {
        title: "Model Breakdown",
        description: "Detailed analysis of how each AI model mentions your brand when prompted about your industry.",
        image: "/features/pulse-example-2.png",
      },
    ],
  },
  {
    id: "tone",
    name: "Tone",
    description: "The sentiment expressed about you",
    longDescription:
      "Tone analyzes the sentiment polarity in AI responses about your brand. It shows you whether AI models speak positively, neutrally, or negatively about your brand.",
    examples: [
      {
        title: "Sentiment Overview",
        description: "See the overall sentiment distribution across all tested AI models.",
        image: "/features/tone-example-1.png",
      },
      {
        title: "Sentiment Heatmap",
        description: "Detailed breakdown of sentiment by model and prompt, with key positive and negative keywords.",
        image: "/features/tone-example-2.png",
      },
    ],
  },
  {
    id: "accord",
    name: "Accord",
    description: "Alignment with brand values",
    longDescription:
      "Accord measures how well AI models' descriptions of your brand align with your desired brand attributes and messaging. A higher score indicates better alignment with your brand identity.",
    examples: [
      {
        title: "Brand Compliance Score",
        description: "See how well AI models align with your expected brand attributes.",
        image: "/features/accord-example-1.png",
      },
      {
        title: "Attribute Alignment",
        description: "Detailed breakdown of how each brand attribute is represented in AI responses.",
        image: "/features/accord-example-2.png",
      },
    ],
  },
  {
    id: "arena",
    name: "Arena",
    description: "Your AI visibility vs competitors",
    longDescription:
      "Arena identifies which competitors are most frequently mentioned alongside your brand in AI responses, and how your brand compares to them in terms of visibility and sentiment.",
    examples: [
      {
        title: "Competitive Landscape",
        description: "See how your brand visibility compares to competitors across all tested AI models.",
        image: "/features/arena-example-1.png",
      },
      {
        title: "Brand Battle",
        description:
          "Direct comparison of your brand against specific competitors, highlighting strengths and weaknesses.",
        image: "/features/arena-example-2.png",
      },
    ],
  },
  {
    id: "trace",
    name: "Trace",
    description: "What sources AIs rely on",
    longDescription:
      "Trace identifies the sources that AI models reference when discussing your brand, and how frequently they access the web for information. This helps you understand which online sources have the most influence on AI perceptions of your brand.",
    examples: [
      {
        title: "Sources Breakdown",
        description: "See which online sources AI models reference when discussing your brand.",
        image: "/features/trace-example-1.png",
      },
      {
        title: "Web Access Rate",
        description: "Analysis of how frequently each AI model accesses the web for information about your brand.",
        image: "/features/trace-example-2.png",
      },
    ],
  },
  {
    id: "lift",
    name: "Lift",
    description: "Actions to improve AI presence",
    longDescription:
      "Lift provides actionable recommendations to improve your brand's visibility and perception in AI responses. These recommendations are prioritized by impact and effort required.",
    examples: [
      {
        title: "Optimization Recommendations",
        description: "Actionable steps to improve your brand's visibility and perception in AI responses.",
        image: "/features/lift-example-1.png",
      },
      {
        title: "Implementation Strategy",
        description:
          "Prioritized recommendations with impact and effort estimates to help you plan your optimization strategy.",
        image: "/features/lift-example-2.png",
      },
    ],
  },
]

interface FeatureExampleDialogProps {
  open: boolean
  featureId: string | null
  onOpenChange: (open: boolean) => void
}

export function FeatureExampleDialog({ open, featureId, onOpenChange }: FeatureExampleDialogProps) {
  const feature = featureExamples.find((f) => f.id === featureId)
  const [activeTab, setActiveTab] = useState("0")

  if (!feature) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              {feature.name}
              <span className="text-sm font-normal text-mono-500">— {feature.description}</span>
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="pt-2">{feature.longDescription}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="0" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6">
            <TabsList className="w-full">
              {feature.examples.map((example, index) => (
                <TabsTrigger key={index} value={index.toString()} className="flex-1">
                  {example.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {feature.examples.map((example, index) => (
            <TabsContent key={index} value={index.toString()} className="mt-0">
              <div className="relative bg-mono-50 border-t border-b border-mono-200 flex justify-center py-6">
                <div className="relative max-w-[700px] rounded-lg overflow-hidden shadow-md">
                  <Image
                    src={example.image || "/placeholder.svg"}
                    alt={example.title}
                    width={700}
                    height={400}
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="p-6 pt-4">
                <div className="flex items-start gap-2 text-mono-600">
                  <Info className="h-5 w-5 text-accent-500 mt-0.5 flex-shrink-0" />
                  <p>{example.description}</p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export { featureExamples }
