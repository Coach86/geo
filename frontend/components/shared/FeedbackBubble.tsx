"use client"

import { useState, useEffect } from "react"
import { MessageCircle, X, Mail, Minimize2, Maximize2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAuth } from "@/providers/auth-provider"
import { sendFeedback } from "@/lib/api"

interface FeedbackBubbleProps {
  title?: string
  description?: string
  buttonText?: string
  defaultSubject?: string
  startExpanded?: boolean
}

export default function FeedbackBubble({ 
  title = "Need Help or Want to Book a Meeting?",
  description = "Have feedback or suggestions? We'd love to hear from you!",
  buttonText = "Send Feedback",
  defaultSubject = "Product Feedback",
  startExpanded = false
}: FeedbackBubbleProps) {
  const { token, isAuthenticated } = useAuth()
  const [isMinimized, setIsMinimized] = useState(!startExpanded)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [subject, setSubject] = useState(defaultSubject)
  const [isSending, setIsSending] = useState(false)

  const handleSendFeedback = async () => {
    if (!isAuthenticated || !token) {
      toast.error("Please log in to send feedback")
      return
    }

    if (!feedback.trim()) {
      toast.error("Please enter a message")
      return
    }

    setIsSending(true)
    
    try {
      await sendFeedback(
        {
          subject: subject || defaultSubject,
          message: feedback,
        },
        token
      )
      
      toast.success("Feedback sent successfully!")
      
      // Reset form and close dialog
      setFeedback("")
      setSubject(defaultSubject)
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Failed to send feedback:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send feedback")
    } finally {
      setIsSending(false)
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-12 w-12 rounded-full bg-accent-500 hover:bg-accent-600 text-white shadow-lg transition-all duration-300 hover:scale-110"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent-500" />
            <span className="font-medium text-sm text-gray-900">{title}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">
          {description}
        </p>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-accent-500 hover:bg-accent-600 text-white">
              {buttonText}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Us
              </DialogTitle>
              <DialogDescription>
                We'd love to hear from you! Send us your feedback or questions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">Your Message</Label>
                <Textarea
                  id="feedback"
                  placeholder=""
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendFeedback}
                disabled={isSending || !feedback.trim()}
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}