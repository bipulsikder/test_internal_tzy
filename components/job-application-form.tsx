"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react"

interface JobApplicationFormProps {
  jobId: string
  jobTitle: string
}

export function JobApplicationForm({ jobId, jobTitle }: JobApplicationFormProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) {
      toast({
        title: "Resume Required",
        description: "Please upload your resume to continue.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.append("jobId", jobId)
    // File is already in formData if input has name="resume"

    try {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application")
      }

      setSuccess(true)
      toast({
        title: "Application Submitted!",
        description: "We have received your application. Good luck!",
        className: "bg-green-50 border-green-200 text-green-800",
      })
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Application Sent!</h3>
        <p className="text-gray-600">
          Thank you for applying to the <strong>{jobTitle}</strong> position. 
          We will review your application and get back to you shortly.
        </p>
        <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
        >
            Submit Another Application
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input id="name" name="name" required placeholder="John Doe" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input id="email" name="email" type="email" required placeholder="john@example.com" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+1 (555) 000-0000" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resume">Resume / CV *</Label>
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors text-center cursor-pointer relative">
            <input 
                type="file" 
                id="resume" 
                name="resume" 
                accept=".pdf,.doc,.docx,.txt" 
                required
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="flex flex-col items-center gap-2 pointer-events-none">
                <Upload className="h-8 w-8 text-gray-400" />
                {file ? (
                    <div className="text-sm font-medium text-green-600 truncate max-w-[200px]">
                        {file.name}
                    </div>
                ) : (
                    <>
                        <span className="text-sm font-medium text-gray-600">Click to upload resume</span>
                        <span className="text-xs text-gray-400">PDF, DOCX, TXT (Max 10MB)</span>
                    </>
                )}
            </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
        <Textarea 
            id="coverLetter" 
            name="coverLetter" 
            placeholder="Tell us why you're a great fit..." 
            className="min-h-[100px]"
        />
      </div>

      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Application"
        )}
      </Button>
      
      <p className="text-xs text-center text-gray-400 pt-2">
        By submitting, you agree to our privacy policy and terms of service.
      </p>
    </form>
  )
}
