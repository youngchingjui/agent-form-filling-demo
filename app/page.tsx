'use client'

import { useState } from 'react'
import { CertificationForm } from '@/components/certification-form'
import { VoiceAgent } from '@/components/voice-agent'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { useFormStore } from '@/lib/form-store'
import { getFormCompletionStatus, getMissingRequiredFields } from '@/lib/certification-form'
import { 
  MessageSquare, 
  FileText, 
  CheckCircle, 
  ShieldCheck,
  ArrowRight,
  Send,
  Mic
} from 'lucide-react'

function Header() {
  const { formData } = useFormStore()
  const status = getFormCompletionStatus(formData)
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">CertifyAI</h1>
            <p className="text-xs text-muted-foreground">Product Certification Assistant</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge 
            variant={status.overall.percentage === 100 ? 'default' : 'secondary'}
            className="hidden md:flex"
          >
            {status.overall.percentage}% Complete
          </Badge>
          
          {/* Mobile voice agent trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="default" size="sm" className="md:hidden">
                <Mic className="mr-2 h-4 w-4" />
                Voice Assistant
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] p-0">
              <VoiceAgent />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function QuickStartGuide() {
  return (
    <div className="mb-6 rounded-lg border bg-card p-4 md:p-6">
      <h2 className="mb-4 text-lg font-semibold">Getting Started</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium">1. Talk to the Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Click the microphone and describe your product and company. The AI will extract the relevant information.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium">2. Review the Form</h3>
            <p className="text-sm text-muted-foreground">
              Watch as the form fills automatically. Make any manual edits if needed.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium">3. Submit for Review</h3>
            <p className="text-sm text-muted-foreground">
              Once complete, submit your form and our team will contact you within 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubmitSection() {
  const { formData } = useFormStore()
  const missingFields = getMissingRequiredFields(formData)
  const status = getFormCompletionStatus(formData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  const handleSubmit = async () => {
    if (missingFields.length > 0) return
    
    setIsSubmitting(true)
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setSubmitted(true)
  }
  
  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950">
        <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600 dark:text-green-400" />
        <h3 className="mb-2 text-lg font-semibold text-green-900 dark:text-green-100">
          Application Submitted!
        </h3>
        <p className="text-sm text-green-700 dark:text-green-300">
          Thank you for your submission. Our certification team will review your application 
          and contact you within 24-48 hours.
        </p>
      </div>
    )
  }
  
  return (
    <div className="rounded-lg border bg-card p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-semibold">Ready to Submit?</h3>
          {missingFields.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {missingFields.length} required field{missingFields.length > 1 ? 's' : ''} remaining
            </p>
          ) : (
            <p className="text-sm text-green-600 dark:text-green-400">
              All required fields complete!
            </p>
          )}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={missingFields.length > 0 || isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <>
              Submit Application
              <Send className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      
      {missingFields.length > 0 && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            Missing Fields:
          </p>
          <div className="flex flex-wrap gap-2">
            {missingFields.map((field) => (
              <Badge key={field} variant="outline" className="text-xs">
                {field.replace(/([A-Z])/g, ' $1').trim()}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          {/* Main Form Area */}
          <div className="space-y-6">
            <QuickStartGuide />
            <CertificationForm />
            <SubmitSection />
          </div>
          
          {/* Desktop Voice Agent Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 h-[calc(100vh-8rem)]">
              <VoiceAgent />
            </div>
          </div>
        </div>
      </main>
      
      {/* Mobile Voice Assistant FAB hint */}
      <div className="fixed bottom-4 right-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
              <MessageSquare className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] p-0">
            <VoiceAgent />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
