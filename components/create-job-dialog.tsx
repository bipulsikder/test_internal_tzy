import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog as UiDialog, DialogContent as UiDialogContent, DialogHeader as UiDialogHeader, DialogTitle as UiDialogTitle } from "@/components/ui/dialog"

interface CreateJobDialogProps {
  onJobCreated: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  jobId?: string
  initialValues?: Partial<{
    title: string
    industry: string
    location: string
    type: string
    description: string
    requirements: string | string[]
    salary_range: string
    positions: number
    client_name: string
    experience: string
  }>
}

export function CreateJobDialog({ onJobCreated, open, onOpenChange, trigger, jobId, initialValues }: CreateJobDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    title: initialValues?.title || "",
    industry: initialValues?.industry || "",
    location: initialValues?.location || "",
    type: initialValues?.type || "Full-time",
    description: initialValues?.description || "",
    requirements: Array.isArray(initialValues?.requirements) ? (initialValues?.requirements as string[]).join("\n") : (initialValues?.requirements as string) || "",
    salary_range: initialValues?.salary_range || "",
    positions: initialValues?.positions ?? 1,
    client_name: initialValues?.client_name || "",
    experience: initialValues?.experience || ""
  })
  const [internalOpen, setInternalOpen] = useState(false)
  const [industryOpen, setIndustryOpen] = useState(false)
  const [generateHintOpen, setGenerateHintOpen] = useState(false)
  const [minRequirements, setMinRequirements] = useState("")

  // Handle controlled vs uncontrolled state
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  useEffect(() => {
    if (initialValues) {
        setFormData({
            title: initialValues.title || "",
            industry: initialValues.industry || "",
            location: initialValues.location || "",
            type: initialValues.type || "Full-time",
            description: initialValues.description || "",
            requirements: Array.isArray(initialValues.requirements) ? (initialValues.requirements as string[]).join("\n") : (initialValues.requirements as string) || "",
            salary_range: initialValues.salary_range || "",
            positions: initialValues.positions ?? 1,
            client_name: initialValues.client_name || "",
            experience: initialValues.experience || ""
        })
    }
  }, [initialValues, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        requirements: formData.requirements.split('\n').filter(line => line.trim() !== '')
      }

      const url = jobId ? `/api/jobs/${jobId}` : "/api/jobs"
      const method = jobId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error("Failed to create job")

      toast({
        title: "Success",
        description: jobId ? "Job updated successfully" : "Job created successfully",
      })
      setIsOpen(false)
      onJobCreated()
      setFormData({
        title: "",
        industry: "",
        location: "",
        type: "Full-time",
        description: "",
        requirements: "",
        salary_range: "",
        positions: 1,
        client_name: "",
        experience: ""
      })
    } catch (error) {
      toast({
        title: "Error",
        description: jobId ? "Failed to update job" : "Failed to create job",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const INDUSTRY_OPTIONS = [
    "Logistics",
    "Transportation",
    "Supply Chain",
    "Warehousing",
    "Manufacturing",
    "E-commerce",
    "Technology",
    "Finance",
  ]

  const generateJD = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/generate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customInputs: {
            jobTitle: formData.title,
            industry: formData.industry,
            experienceLevel: formData.experience,
            additionalRequirements: minRequirements
          }
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate JD")
      
      const jd = data.jobDescription || data
      
      // Format the full description with headers as requested
      const formattedDescription = [
        jd.description,
        "\n### Key Responsibilities",
        ...(Array.isArray(jd.responsibilities) ? jd.responsibilities.map((r: string) => `• ${r}`) : [jd.responsibilities]),
        "\n### Requirements",
        ...(Array.isArray(jd.requirements) ? jd.requirements.map((r: string) => `• ${r}`) : [jd.requirements]),
        "\n### Benefits",
        ...(Array.isArray(jd.benefits) ? jd.benefits.map((r: string) => `• ${r}`) : [jd.benefits])
      ].join("\n")

      setFormData(prev => ({
        ...prev,
        description: formattedDescription,
        requirements: "" // Clear requirements as they are now in description
      }))
      setGenerateHintOpen(false)
      toast({ title: "Generated JD", description: "Job Description, Responsibilities, and Requirements have been generated." })
    } catch (error: any) {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{jobId ? "Edit Job Opening" : "Create Job Opening"}</DialogTitle>
          <DialogDescription>
            {jobId ? "Update job opening details and requirements." : "Post a new job opening to track applicants."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setIndustryOpen(true)}>
                {formData.industry ? formData.industry : "Select or type industry"}
              </Button>
              <UiDialog open={industryOpen} onOpenChange={setIndustryOpen}>
                <UiDialogContent className="sm:max-w-[420px]">
                  <UiDialogHeader>
                    <UiDialogTitle>Select Industry</UiDialogTitle>
                  </UiDialogHeader>
                  <Command>
                    <CommandInput placeholder="Search industry..." />
                    <CommandList>
                      <CommandEmpty>
                        <div className="space-y-3">
                          <div>No results.</div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Create new industry"
                              value={formData.industry}
                              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            />
                            <Button
                              onClick={() => setIndustryOpen(false)}
                            >
                              Use
                            </Button>
                          </div>
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Suggestions">
                        {INDUSTRY_OPTIONS.map((opt) => (
                          <CommandItem key={opt} onSelect={() => { setFormData({ ...formData, industry: opt }); setIndustryOpen(false) }}>
                            {opt}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </UiDialogContent>
              </UiDialog>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Employment Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="positions">Number of Positions</Label>
              <Input
                id="positions"
                type="number"
                min={1}
                value={formData.positions}
                onChange={(e) => setFormData({ ...formData, positions: parseInt(e.target.value || "1", 10) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client Name</Label>
              <Input
                id="client"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Experience</Label>
            <Input
              id="experience"
              placeholder="e.g. 3-5 years, Senior, Fresher"
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salary">Salary Range</Label>
            <Input
              id="salary"
              placeholder="e.g. $80k - $120k"
              value={formData.salary_range}
              onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Job Description</Label>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">
                AI will generate description and requirements based on your inputs.
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={() => setGenerateHintOpen(true)}>
                Generate with AI
              </Button>
            </div>
            <Textarea
              id="description"
              className="min-h-[200px]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Job description will appear here..."
            />
          </div>

          {/* Requirements input removed as requested - handled by AI generation and stored in description or separate field hidden from manual simple input if needed, 
              but for now we'll keep the state but remove the UI input, merging it into description or handling it via AI response */}


          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Job
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      <UiDialog open={generateHintOpen} onOpenChange={setGenerateHintOpen}>
        <UiDialogContent className="sm:max-w-[500px]">
          <UiDialogHeader>
            <UiDialogTitle>Generate JD with AI</UiDialogTitle>
          </UiDialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter minimal requirements if you have, or you can skip.
            </p>
            <Textarea
              placeholder="Optional: key requirements, benefits, must-have skills"
              value={minRequirements}
              onChange={(e) => setMinRequirements(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGenerateHintOpen(false)}>Cancel</Button>
              <Button onClick={generateJD} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </div>
          </div>
        </UiDialogContent>
      </UiDialog>
    </Dialog>
  )
}
