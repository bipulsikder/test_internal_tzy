"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Dialog as UiDialog, DialogContent as UiDialogContent, DialogHeader as UiDialogHeader, DialogTitle as UiDialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

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
    client_id: string
    amount: string
    skills_required: string | string[]
    experience: string
    sub_category: string
  }>
}

export function CreateJobDialog({ onJobCreated, open, onOpenChange, trigger, jobId, initialValues }: CreateJobDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [clients, setClients] = useState<{ id: string; name: string; slug: string }[]>([])
  const [clientOpen, setClientOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: initialValues?.title || "",
    industry: initialValues?.industry || "",
    sub_category: (initialValues as any)?.sub_category || "",
    location: initialValues?.location || "",
    type: initialValues?.type || "Full-time",
    description: initialValues?.description || "",
    requirements: Array.isArray(initialValues?.requirements) ? (initialValues?.requirements as string[]).join("\n") : (initialValues?.requirements as string) || "",
    salary_range: initialValues?.salary_range || "",
    positions: initialValues?.positions ?? 1,
    client_name: initialValues?.client_name || "",
    client_id: (initialValues as any)?.client_id || "",
    amount: (initialValues as any)?.amount || "",
    skills_required: Array.isArray((initialValues as any)?.skills_required)
      ? ((initialValues as any).skills_required as string[]).join("\n")
      : ((initialValues as any)?.skills_required as string) || "",
    experience: initialValues?.experience || ""
  })
  const [internalOpen, setInternalOpen] = useState(false)
  const [industryOpen, setIndustryOpen] = useState(false)
  const [generateHintOpen, setGenerateHintOpen] = useState(false)
  const [minRequirements, setMinRequirements] = useState("")
  const [skillInput, setSkillInput] = useState("")

  const BASE_SKILL_SUGGESTIONS = [
    "Dispatch",
    "TMS",
    "Fleet operations",
    "Warehouse operations",
    "Load planning",
    "Brokerage",
    "Customer support",
    "Excel",
    "GPS",
    "Safety compliance",
    "DOT compliance",
    "Supply chain",
    "Transportation",
    "Logistics",
    "Last-mile",
    "Route optimization"
  ]

  const SKILL_SUGGESTIONS_BY_SUBCATEGORY: Record<string, string[]> = {
    "Car Carrier": ["Auto transport", "Load securement", "Vehicle inspection", "Damage documentation", "ELD", "DOT compliance"],
    "Dry Van": ["Dock operations", "Trailer management", "Appointment scheduling", "Load planning", "ELD", "DOT compliance"],
    "Reefer": ["Temperature monitoring", "Cold chain", "Reefer unit basics", "ELD", "DOT compliance"],
    Flatbed: ["Straps & chains", "Load securement", "Tarps", "Oversize permits", "ELD", "DOT compliance"],
    Tanker: ["Tank cleaning", "Hazmat basics", "Safety compliance", "ELD", "DOT compliance"],
    Hazmat: ["Hazmat", "Safety compliance", "Documentation", "ELD", "DOT compliance"],
    Intermodal: ["Port operations", "Chassis management", "Drayage", "Appointment scheduling"],
    "Last Mile": ["Delivery routing", "Customer experience", "Proof of delivery", "Route optimization"],
    LTL: ["Dock scheduling", "Freight classification", "Claims handling", "Operations coordination"],
    Warehousing: ["WMS", "Inventory control", "Inbound/outbound", "Cycle counting", "Excel"],
    Dispatch: ["Dispatch", "TMS", "Route planning", "Driver support", "Customer support"],
    "Fleet Maintenance": ["Preventive maintenance", "Compliance", "Parts coordination", "Vendor management"],
    Other: []
  }

  const SUB_CATEGORY_OPTIONS = [
    "Car Carrier",
    "Dry Van",
    "Reefer",
    "Flatbed",
    "Tanker",
    "LTL",
    "Last Mile",
    "Intermodal",
    "Hazmat",
    "Warehousing",
    "Dispatch",
    "Fleet Maintenance",
    "Other"
  ]

  const currentSkillTags = useMemo(() => {
    return formData.skills_required
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
  }, [formData.skills_required])

  const filteredSkillSuggestions = useMemo(() => {
    const q = skillInput.trim().toLowerCase()
    if (!q) return []
    const existing = new Set(currentSkillTags.map((s) => s.toLowerCase()))
    const dynamic = [
      ...(SKILL_SUGGESTIONS_BY_SUBCATEGORY[formData.sub_category] || []),
      ...BASE_SKILL_SUGGESTIONS
    ]
    const unique = Array.from(new Set(dynamic.map((s) => s.trim()).filter(Boolean)))
    return unique.filter((s) => s.toLowerCase().includes(q) && !existing.has(s.toLowerCase())).slice(0, 8)
  }, [skillInput, currentSkillTags])

  const suggestedSkills = useMemo(() => {
    const existing = new Set(currentSkillTags.map((s) => s.toLowerCase()))
    const dynamic = [
      ...(SKILL_SUGGESTIONS_BY_SUBCATEGORY[formData.sub_category] || []),
      ...BASE_SKILL_SUGGESTIONS
    ]
    const unique = Array.from(new Set(dynamic.map((s) => s.trim()).filter(Boolean)))
    return unique.filter((s) => !existing.has(s.toLowerCase())).slice(0, 10)
  }, [formData.sub_category, currentSkillTags])

  const addSkillTag = (value: string) => {
    const v = value.trim()
    if (!v) return
    const existing = new Set(currentSkillTags.map((s) => s.toLowerCase()))
    if (existing.has(v.toLowerCase())) return
    const next = [...currentSkillTags, v]
    setFormData({ ...formData, skills_required: next.join("\n") })
    setSkillInput("")
  }

  const removeSkillTag = (value: string) => {
    const next = currentSkillTags.filter((s) => s !== value)
    setFormData({ ...formData, skills_required: next.join("\n") })
  }

  // Handle controlled vs uncontrolled state
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  useEffect(() => {
    if (initialValues) {
        setFormData({
            title: initialValues.title || "",
            industry: initialValues.industry || "",
            sub_category: (initialValues as any)?.sub_category || "",
            location: initialValues.location || "",
            type: initialValues.type || "Full-time",
            description: initialValues.description || "",
            requirements: Array.isArray(initialValues.requirements) ? (initialValues.requirements as string[]).join("\n") : (initialValues.requirements as string) || "",
            salary_range: initialValues.salary_range || "",
            positions: initialValues.positions ?? 1,
            client_name: initialValues.client_name || "",
            client_id: (initialValues as any)?.client_id || "",
            amount: (initialValues as any)?.amount || "",
            skills_required: Array.isArray((initialValues as any)?.skills_required)
              ? ((initialValues as any).skills_required as string[]).join("\n")
              : ((initialValues as any)?.skills_required as string) || "",
            experience: initialValues.experience || ""
        })
    }
  }, [initialValues, isOpen])

  useEffect(() => {
    if (!isOpen) return
    fetch("/api/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setClients(Array.isArray(data) ? data.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })) : [])
      })
      .catch(() => setClients([]))
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        requirements: formData.requirements.split("\n").filter((line) => line.trim() !== ""),
        skills_required: currentSkillTags,
        salary_range: null
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
        sub_category: "",
        location: "",
        type: "Full-time",
        description: "",
        requirements: "",
        salary_range: "",
        positions: 1,
        client_name: "",
        client_id: "",
        amount: "",
        skills_required: "",
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
            subCategory: formData.sub_category,
            location: formData.location,
            type: formData.type,
            experienceLevel: formData.experience,
            skillsRequired: currentSkillTags,
            additionalRequirements: minRequirements
          }
        })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to generate JD")

      const jd = data?.jobDescription || data
      const responsibilities = Array.isArray(jd?.responsibilities) ? jd.responsibilities : []
      const requirements = Array.isArray(jd?.requirements) ? jd.requirements : []
      const skills = Array.isArray(jd?.skills) ? jd.skills : []

      const formattedDescription = [
        jd?.description || "",
        responsibilities.length ? "\n### Key Responsibilities\n" + responsibilities.map((r: string) => `• ${r}`).join("\n") : "",
        requirements.length ? "\n### Requirements\n" + requirements.map((r: string) => `• ${r}`).join("\n") : "",
        skills.length ? "\n### Skills\n" + skills.map((r: string) => `• ${r}`).join("\n") : ""
      ]
        .filter((x) => typeof x === "string" && x.trim().length)
        .join("\n")

      setFormData((prev) => ({
        ...prev,
        description: formattedDescription,
        requirements: ""
      }))

      setGenerateHintOpen(false)
      toast({ title: "Generated JD", description: "Job description generated (no benefits section)." })
    } catch (error: any) {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="w-[95vw] sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
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
              <Label htmlFor="sub_category">Sub category</Label>
              <Select value={formData.sub_category} onValueChange={(val) => setFormData({ ...formData, sub_category: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {SUB_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Employment Type</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setClientOpen(true)}>
                {formData.client_name ? formData.client_name : "Select client"}
              </Button>
              <UiDialog open={clientOpen} onOpenChange={setClientOpen}>
                <UiDialogContent className="sm:max-w-[420px]">
                  <UiDialogHeader>
                    <UiDialogTitle>Select client</UiDialogTitle>
                  </UiDialogHeader>
                  <Command>
                    <CommandInput placeholder="Search client..." />
                    <CommandList>
                      <CommandEmpty>No clients found.</CommandEmpty>
                      <CommandGroup heading="Clients">
                        {clients.map((c) => (
                          <CommandItem
                            key={c.id}
                            onSelect={() => {
                              setFormData({ ...formData, client_id: c.id, client_name: c.name })
                              setClientOpen(false)
                            }}
                          >
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </UiDialogContent>
              </UiDialog>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                placeholder="e.g. $35/hr or $90k/yr"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills_required">Skills required</Label>
              <div className="rounded-lg border p-3">
                <div className="flex flex-wrap gap-2">
                  {currentSkillTags.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => removeSkillTag(s)}
                      className="rounded-full border bg-muted px-3 py-1 text-xs hover:bg-muted/70"
                      title="Remove"
                    >
                      {s} ×
                    </button>
                  ))}
                </div>
                {suggestedSkills.length ? (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-muted-foreground">Suggested</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestedSkills.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addSkillTag(s)}
                          className="rounded-full border bg-card px-3 py-1 text-xs hover:bg-accent"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-3">
                  <Input
                    id="skills_required"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Type a skill and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addSkillTag(skillInput)
                      }
                    }}
                  />
                  {filteredSkillSuggestions.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {filteredSkillSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addSkillTag(s)}
                          className="rounded-full border bg-card px-3 py-1 text-xs hover:bg-accent"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
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
            <Label htmlFor="description">Job Description</Label>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Generate a relevant JD from title, subcategory and skills.</span>
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
        <UiDialogContent className="sm:max-w-[520px]">
          <UiDialogHeader>
            <UiDialogTitle>Generate JD with AI</UiDialogTitle>
          </UiDialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add any must-haves (no benefits). Example: lanes, shift, tools, compliance, team size.
            </p>
            <Textarea
              placeholder="Optional: must-have requirements, constraints, tools"
              value={minRequirements}
              onChange={(e) => setMinRequirements(e.target.value)}
              className="min-h-[90px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGenerateHintOpen(false)}>
                Cancel
              </Button>
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
