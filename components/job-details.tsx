import { useMemo, useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowLeft, Calendar, ExternalLink, Eye, Link2, Mail, MessageSquare, Save, User } from "lucide-react"
import { format } from "date-fns"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const CandidatePreviewDialogDynamic = dynamic(() => import("./candidate-preview-dialog").then(m => m.CandidatePreviewDialog), {
  ssr: false,
})

interface Job {
  id: string
  title: string
  department: string
  location: string
  type: string
  status: string
  description: string
  requirements: string[]
  created_at: string
  client_id?: string | null
  client_name?: string | null
}

type Client = {
  id: string
  name: string
  slug: string
  website: string
  company_type: string | null
  location: string | null
  about: string | null
  logo_url: string | null
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
}

interface Application {
  id: string
  candidate_id: string
  status: string
  applied_at: string
  notes: string
  source?: string
  match_score?: number
  candidates: {
    name: string
    email: string
    current_role: string
    location: string
    // Add other candidate fields as needed for preview
    [key: string]: any
  }
}

interface JobInvite {
  id: string
  email: string
  token: string
  status: string
  sent_at: string | null
  opened_at: string | null
  responded_at: string | null
  applied_at: string | null
  rejected_at: string | null
  created_at: string | null
}

interface JobDetailsProps {
  job: Job
  onBack: () => void
  initialTab?: string
}

const STATUS_COLUMNS = [
  { id: "applied", label: "Applied", color: "bg-blue-100 text-blue-800" },
  { id: "shortlist", label: "Shortlist", color: "bg-indigo-100 text-indigo-800" },
  { id: "screening", label: "Screening", color: "bg-yellow-100 text-yellow-800" },
  { id: "interview", label: "Interview", color: "bg-purple-100 text-purple-800" },
  { id: "offer", label: "Offer", color: "bg-green-100 text-green-800" },
  { id: "hired", label: "Hired", color: "bg-emerald-100 text-emerald-800" },
  { id: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" }
]

export function JobDetails({ job, onBack, initialTab }: JobDetailsProps) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [invites, setInvites] = useState<JobInvite[]>([])
  const { toast } = useToast()
  const [activeStage, setActiveStage] = useState<string>(initialTab || "all")
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [clientOpen, setClientOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteCreating, setInviteCreating] = useState(false)
  
  // State for notes editing
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState("")

  useEffect(() => {
    fetchApplications()
  }, [job.id])

  useEffect(() => {
    fetch(`/api/job-invites?jobId=${job.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load invites"))))
      .then((d) => setInvites(Array.isArray(d?.invites) ? d.invites : []))
      .catch(() => setInvites([]))
  }, [job.id])

  const inviteBase = (process.env.NEXT_PUBLIC_BOARD_APP_BASE_URL || "").replace(/\/$/, "")
  const inviteLink = (token: string) => (inviteBase ? `${inviteBase}/invite/${token}` : `/invite/${token}`)

  const inviteBadgeClass = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-gray-50 text-gray-700 border-gray-200"
      case "opened":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "applied":
        return "bg-green-50 text-green-700 border-green-200"
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const createInvite = async () => {
    const email = inviteEmail.trim()
    if (!email) return
    setInviteCreating(true)
    try {
      const res = await fetch("/api/job-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, email })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to create invite")
      setInviteEmail("")
      toast({ title: "Invite created", description: data?.emailSent ? "Email sent" : "Invite link created" })
      const refreshed = await fetch(`/api/job-invites?jobId=${job.id}`).then((r) => (r.ok ? r.json() : null))
      setInvites(Array.isArray(refreshed?.invites) ? refreshed.invites : invites)
      if (data?.link) {
        try {
          await navigator.clipboard.writeText(data.link)
          toast({ title: "Copied invite link", description: data.link })
        } catch {
          // ignore
        }
      }
    } catch (e: any) {
      toast({ title: "Invite failed", description: e.message || "Failed", variant: "destructive" })
    } finally {
      setInviteCreating(false)
    }
  }

  useEffect(() => {
    if (!job.client_id) {
      setClient(null)
      return
    }
    fetch("/api/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const found = Array.isArray(rows) ? rows.find((c: any) => c.id === job.client_id) : null
        setClient(found || null)
      })
      .catch(() => setClient(null))
  }, [job.client_id])

  const clientLabel = useMemo(() => {
    return (job.client_id && client?.name) || job.client_name || null
  }, [client?.name, job.client_id, job.client_name])

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/applications?jobId=${job.id}`)
      if (res.ok) {
        const data = await res.json()
        setApplications(data)
      }
    } catch (error) {
      console.error("Failed to fetch applications", error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (applicationId: string, newStatus: string) => {
    // Optimistic update
    setApplications(prev => prev.map(app => 
      app.id === applicationId ? { ...app, status: newStatus } : app
    ))

    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error("Failed to update status")
      
      toast({
        title: "Status Updated",
        description: `Candidate moved to ${newStatus}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
      fetchApplications() // Revert on error
    }
  }

  const handleNoteEdit = (app: Application) => {
    setEditingNoteId(app.id)
    setNoteContent(app.notes || "")
  }

  const saveNote = async (applicationId: string) => {
    try {
        // Optimistic update
        setApplications(prev => prev.map(app => 
            app.id === applicationId ? { ...app, notes: noteContent } : app
        ))
        setEditingNoteId(null)

        const res = await fetch(`/api/applications/${applicationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes: noteContent })
        })

        if (!res.ok) throw new Error("Failed to update note")
        
        toast({
            title: "Note Saved",
            description: "Candidate notes updated successfully",
        })
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to save note",
            variant: "destructive",
        })
        fetchApplications() // Revert
    }
  }

  const openPreview = async (app: Application) => {
      // Use existing candidate data, but fetch more if needed
      // Here we assume app.candidates has enough info, or the dialog handles partial data
      // We can also fetch fresh data like in job-matches-client
      setSelectedCandidate(app.candidates)
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{job.title}</h2>
          <div className="flex gap-2 text-sm text-gray-500">
            {clientLabel ? (
              <button className="text-blue-600 hover:underline" onClick={() => setClientOpen(true)}>
                {clientLabel}
              </button>
            ) : null}
            {clientLabel ? <span>•</span> : null}
            <span>{job.department}</span>
            <span>•</span>
            <span>{job.location}</span>
            <span>•</span>
            <Badge variant="outline">{job.type}</Badge>
            <Badge className={job.status === 'open' ? 'bg-green-500' : 'bg-gray-500'}>
              {job.status}
            </Badge>
            <a 
                href={`/board/${job.id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 flex items-center gap-1 text-blue-600 hover:underline"
            >
                View Public Page <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      <Dialog open={clientOpen} onOpenChange={setClientOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{client?.name || clientLabel || "Client"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {client?.website ? (
              <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {client.website}
              </a>
            ) : null}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Company type</div>
                <div>{client?.company_type || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Location</div>
                <div>{client?.location || "—"}</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">About</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{client?.about || "—"}</div>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-sm font-semibold">Primary contact</div>
              <div className="mt-2 text-sm text-muted-foreground">
                <div>{client?.primary_contact_name || "—"}</div>
                <div>{client?.primary_contact_email || "—"}</div>
                <div>{client?.primary_contact_phone || "—"}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          <div
            className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center justify-center transition-all ${
              activeStage === "all" 
                ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500" 
                : "bg-white hover:border-blue-200 hover:bg-blue-50/50"
            }`}
            onClick={() => setActiveStage("all")}
          >
            <span className={`text-xs font-medium mb-1 ${activeStage === "all" ? "text-blue-700" : "text-gray-500"}`}>
                All
            </span>
            <span className={`text-lg font-bold ${activeStage === "all" ? "text-blue-700" : "text-gray-900"}`}>
                {applications.length}
            </span>
          </div>

          {STATUS_COLUMNS.map((column) => {
            const count = applications.filter((a) => a.status === column.id).length
            const isActive = activeStage === column.id
            // Parse color classes to get border/text colors roughly matching the badge style
            let activeClass = "bg-gray-50 border-gray-500 ring-1 ring-gray-500"
            let textClass = "text-gray-700"
            
            if (column.id === 'applied') { activeClass = "bg-blue-50 border-blue-500 ring-1 ring-blue-500"; textClass = "text-blue-700"; }
            else if (column.id === 'shortlist') { activeClass = "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500"; textClass = "text-indigo-700"; }
            else if (column.id === 'screening') { activeClass = "bg-yellow-50 border-yellow-500 ring-1 ring-yellow-500"; textClass = "text-yellow-700"; }
            else if (column.id === 'interview') { activeClass = "bg-purple-50 border-purple-500 ring-1 ring-purple-500"; textClass = "text-purple-700"; }
            else if (column.id === 'offer') { activeClass = "bg-green-50 border-green-500 ring-1 ring-green-500"; textClass = "text-green-700"; }
            else if (column.id === 'hired') { activeClass = "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500"; textClass = "text-emerald-700"; }
            else if (column.id === 'rejected') { activeClass = "bg-red-50 border-red-500 ring-1 ring-red-500"; textClass = "text-red-700"; }

            return (
              <div
                key={column.id}
                className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center justify-center transition-all ${
                  isActive ? activeClass : "bg-white hover:bg-gray-50"
                }`}
                onClick={() => setActiveStage(column.id)}
              >
                <span className={`text-xs font-medium mb-1 ${isActive ? textClass : "text-gray-500"}`}>
                    {column.label}
                </span>
                <span className={`text-lg font-bold ${isActive ? textClass : "text-gray-900"}`}>
                    {count}
                </span>
              </div>
            )
          })}

          <div
            className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center justify-center transition-all ${
              activeStage === "invites" ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500" : "bg-white hover:border-blue-200 hover:bg-blue-50/50"
            }`}
            onClick={() => setActiveStage("invites")}
          >
            <span className={`text-xs font-medium mb-1 ${activeStage === "invites" ? "text-blue-700" : "text-gray-500"}`}>Invites</span>
            <span className={`text-lg font-bold ${activeStage === "invites" ? "text-blue-700" : "text-gray-900"}`}>{invites.length}</span>
          </div>
        </div>

        <div className="space-y-3">
        {activeStage === "invites" ? (
          <div className="grid gap-3">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium">Invite candidates to apply</div>
                    <div className="mt-1 text-sm text-gray-500">
                      Flow: <span className="font-medium text-gray-700">Sent</span> → <span className="font-medium text-gray-700">Opened</span> → <span className="font-medium text-gray-700">Applied</span>. Candidates land on the Board app and can sign up before applying.
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-[320px]">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Candidate email"
                        className="pl-9"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            createInvite()
                          }
                        }}
                      />
                    </div>
                    <Button onClick={createInvite} disabled={!inviteEmail.trim() || inviteCreating} className="shrink-0">
                      {inviteCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Create invite
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!invites.length ? (
              <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                No invites yet. Create one above to generate a tracked invite link.
              </div>
            ) : (
              invites.map((inv) => (
                <Card key={inv.id} className="shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-base truncate">{inv.email}</div>
                          <Badge variant="outline" className={inviteBadgeClass(inv.status || "sent")}>
                            {(inv.status || "sent").toUpperCase()}
                          </Badge>
                        </div>

                        <div className="mt-2 grid gap-1 text-xs text-gray-500">
                          <div>
                            <span className="font-medium text-gray-700">Sent:</span> {inv.sent_at ? format(new Date(inv.sent_at), "MMM d, yyyy") : "—"}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Opened:</span> {inv.opened_at ? format(new Date(inv.opened_at), "MMM d, yyyy") : "—"}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Applied:</span> {inv.applied_at ? format(new Date(inv.applied_at), "MMM d, yyyy") : "—"}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Rejected:</span> {inv.rejected_at ? format(new Date(inv.rejected_at), "MMM d, yyyy") : "—"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={async () => {
                            const link = inviteLink(inv.token)
                            try {
                              await navigator.clipboard.writeText(link)
                              toast({ title: "Copied", description: link })
                            } catch {
                              toast({ title: "Copy failed", description: link, variant: "destructive" })
                            }
                          }}
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Copy link
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8"
                          onClick={() => window.open(inviteLink(inv.token), "_blank", "noopener,noreferrer")}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <>
          {(activeStage === "all" 
              ? applications 
              : applications.filter((a) => a.status === activeStage)
              ).map((app) => (
              <Card key={app.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                         <Avatar className="h-10 w-10 border border-gray-200">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                                {app.candidates?.name?.substring(0, 2).toUpperCase() || "CN"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium text-base flex items-center gap-2">
                                {app.candidates?.name}
                                {app.match_score !== undefined && app.match_score !== null && (
                                    <Badge variant="outline" className={`text-xs font-normal ${
                                        app.match_score >= 0.8 ? "bg-green-50 text-green-700 border-green-200" :
                                        app.match_score >= 0.6 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                        "bg-gray-50 text-gray-700 border-gray-200"
                                    }`}>
                                        {Math.round(app.match_score * 100)}% Match
                                    </Badge>
                                )}
                            </div>
                            <div className="text-sm text-gray-500">
                                {app.candidates?.current_role || "No role specified"}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8"
                            onClick={() => openPreview(app)}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                        </Button>
                        <Select defaultValue={app.status} onValueChange={(val) => updateStatus(app.id, val)}>
                            <SelectTrigger className="h-8 w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                            {STATUS_COLUMNS.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                {s.label}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-700">Source:</span>
                        <span className="capitalize px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                            {app.source?.replace('_', ' ') || 'Unknown'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                        <Calendar className="h-3.5 w-3.5" />
                        Applied: {format(new Date(app.applied_at), "MMM d, yyyy")}
                    </div>
                </div>

                {/* Notes Section */}
                <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs font-medium text-gray-700">Notes</span>
                    </div>
                    
                    {editingNoteId === app.id ? (
                        <div className="space-y-2">
                            <Textarea 
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="Add notes about this candidate..."
                                className="min-h-[80px] text-sm"
                            />
                            <div className="flex justify-end gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setEditingNoteId(null)}
                                    className="h-7 text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    size="sm" 
                                    onClick={() => saveNote(app.id)}
                                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                >
                                    <Save className="h-3 w-3 mr-1" />
                                    Save Note
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div 
                            className="bg-gray-50 rounded p-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors min-h-[40px]"
                            onClick={() => handleNoteEdit(app)}
                        >
                            {app.notes ? (
                                <p className="whitespace-pre-wrap">{app.notes}</p>
                            ) : (
                                <p className="text-gray-400 italic">Click to add notes...</p>
                            )}
                        </div>
                    )}
                </div>
              </CardContent>
              </Card>
          ))}

          {(activeStage === "all" 
              ? applications.length === 0 
              : applications.filter((a) => a.status === activeStage).length === 0) && (
              <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                  <div className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                          <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <p>No candidates in this stage</p>
                  </div>
              </div>
          )}
          </>
        )}
        </div>
      </div>

      {selectedCandidate && (
        <CandidatePreviewDialogDynamic
          candidate={selectedCandidate}
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          jobId={job.id}
          showRelevanceScore={false}
        />
      )}
    </div>
  )
}
