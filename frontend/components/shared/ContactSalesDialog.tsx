"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Mail, 
  Copy, 
  Check,
  Calendar
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ContactSalesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planName?: string
}

export function ContactSalesDialog({ 
  open, 
  onOpenChange, 
  planName = "Enterprise" 
}: ContactSalesDialogProps) {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const { toast } = useToast()

  const contactEmail = "contact@getmint.ai"
  const subject = `${planName} Plan Inquiry`
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
      
      toast({
        title: "Copied to clipboard",
        description: "Email address copied successfully",
      })
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      })
    }
  }

  const handleEmailClick = () => {
    // Try to open mailto link
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`
    
    // Show a toast in case mailto doesn't work
    setTimeout(() => {
      toast({
        title: "Email client not opened?",
        description: "You can copy the email address and send manually",
      })
    }, 1000)
  }

  const handleScheduleCall = () => {
    // This could open a Calendly link or similar
    window.open("https://calendly.com/getmint-sales/30min", "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contact Sales</DialogTitle>
          <DialogDescription>
            Get in touch with our sales team to discuss the {planName} plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Option */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Us
            </Label>
            <div className="flex items-center gap-2">
              <Input 
                value={contactEmail} 
                readOnly 
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(contactEmail)}
              >
                {copiedEmail ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={handleEmailClick}
            >
              Open Email Client
            </Button>
          </div>

          {/* Schedule a Call Option */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule a Call
            </Label>
            <Button 
              className="w-full" 
              onClick={handleScheduleCall}
            >
              Book a Meeting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}