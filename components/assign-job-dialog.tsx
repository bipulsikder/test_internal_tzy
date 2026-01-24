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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Job {
  id: string
  title: string
  status: string
}

interface AssignJobDialogProps {
  candidateId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateName: string
}

export function AssignJobDialog({ candidateId, open, onOpenChange, candidateName }: AssignJobDialogProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingJobs, setFetchingJobs] = useState(false)
  const [selectedJob, setSelectedJob] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [sendInvite, setSendInvite] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchJobs()
    }
  }, [open])

  const fetchJobs = async () => {
    setFetchingJobs(true)
    try {
      const res = await fetch("/api/jobs?status=open")
      if (res.ok) {
        const data = await res.json()
        setJobs(data)
      }
    } catch (error) {
      console.error("Failed to fetch jobs", error)
    } finally {
      setFetchingJobs(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedJob) return
    setLoading(true)
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: selectedJob,
          candidate_id: candidateId,
          notes
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to assign")
      }

      toast({
        title: "Success",
        description: `Candidate assigned to job successfully`,
      })

      if (sendInvite) {
        try {
          const inv = await fetch("/api/job-invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: selectedJob, candidateId })
          })
          const data = await inv.json().catch(() => null)
          if (inv.ok && data?.link) {
            toast({
              title: "Invite link created",
              description: data.link
            })
          } else if (data?.error) {
            toast({
              title: "Invite not sent",
              description: data.error,
              variant: "destructive"
            })
          }
        } catch (e: any) {
          toast({
            title: "Invite not sent",
            description: e.message || "Failed to create invite",
            variant: "destructive"
          })
        }
      }

      onOpenChange(false)
      setSelectedJob("")
      setNotes("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign job",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign to Job</DialogTitle>
          <DialogDescription>
            Assign {candidateName} to an active job opening.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="job">Select Job</Label>
            <Select value={selectedJob} onValueChange={setSelectedJob} disabled={fetchingJobs}>
              <SelectTrigger>
                <SelectValue placeholder={fetchingJobs ? "Loading jobs..." : "Select a job"} />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
                {jobs.length === 0 && !fetchingJobs && (
                  <SelectItem value="none" disabled>No open jobs found</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add initial screening notes..."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="sendInvite"
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="sendInvite">Create invite link for this job</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading || !selectedJob}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
