"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, MapPin, Briefcase, Users, Clock, MoreHorizontal } from "lucide-react"
import { CreateJobDialog } from "./create-job-dialog"
import { formatDistanceToNow } from "date-fns"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  positions?: number
  client_name?: string
  client_id?: string | null
  amount?: string | null
  skills_required?: string[] | null
  experience?: string
}

export function JobsDashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [clients, setClients] = useState<{ id: string; name: string; slug: string }[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [appCounts, setAppCounts] = useState<Record<string, number>>({})
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({})
  const [dbMatchCounts, setDbMatchCounts] = useState<Record<string, number>>({})
  const router = useRouter()

  useEffect(() => {
    fetchJobs()
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients")
      const data = res.ok ? await res.json() : []
      setClients(Array.isArray(data) ? data.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })) : [])
    } catch {
      setClients([])
    }
  }

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/jobs")
      if (res.ok) {
        const data = await res.json()
        setJobs(data)
        const counts: Record<string, number> = {}
        const pendings: Record<string, number> = {}
        const dbCounts: Record<string, number> = {}
        await Promise.all(
          (data || []).map(async (job: Job) => {
            try {
              const appsRes = await fetch(`/api/applications?jobId=${job.id}`)
              const apps = appsRes.ok ? await appsRes.json() : []
              counts[job.id] = apps.length
              pendings[job.id] = (apps || []).filter((a: any) => a.status === "applied").length
            } catch {}
            try {
              const dmRes = await fetch(`/api/jobs/${job.id}/matches?countOnly=1`)
              const dm = dmRes.ok ? await dmRes.json() : { total: 0 }
              dbCounts[job.id] = dm.total || 0
            } catch {}
          })
        )
        setAppCounts(counts)
        setPendingCounts(pendings)
        setDbMatchCounts(dbCounts)
      }
    } catch (error) {
      console.error("Failed to fetch jobs", error)
    } finally {
      setLoading(false)
    }
  }

  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  const filteredJobs = jobs
    .filter((job) => {
      if (statusFilter === "all") return true
      return job.status === statusFilter
    })
    .filter((job) => {
      if (clientFilter === "all") return true
      return (job.client_id || "") === clientFilter
    })
    .filter((job) => {
      const q = searchQuery.toLowerCase()
      return (
        job.title.toLowerCase().includes(q) ||
        job.department.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        (job.client_name || "").toLowerCase().includes(q) ||
        (job.client_id && clientsById.get(job.client_id)?.name.toLowerCase().includes(q))
      )
    })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Jobs</h2>
          <p className="text-muted-foreground">Manage job openings and track applicants.</p>
        </div>
        <CreateJobDialog 
          open={createOpen} 
          onOpenChange={setCreateOpen} 
          onJobCreated={fetchJobs}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Post New Job
            </Button>
          }
        />
        {editingJob && (
          <CreateJobDialog
            key={editingJob.id}
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open)
              if (!open) setEditingJob(null)
            }}
            onJobCreated={fetchJobs}
            jobId={editingJob.id}
            initialValues={{
              title: editingJob.title,
              industry: editingJob.department,
              location: editingJob.location,
              type: editingJob.type,
              description: editingJob.description,
              requirements: editingJob.requirements,
              salary_range: (editingJob as any).salary_range,
              positions: (editingJob as any).positions,
              client_name: (editingJob as any).client_name,
              client_id: (editingJob as any).client_id,
              amount: (editingJob as any).amount,
              skills_required: (editingJob as any).skills_required,
              experience: (editingJob as any).experience,
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-[180px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="inactive">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[240px]">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map(job => (
            <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/jobs/${job.id}`)}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                      {job.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingJob(job); setEditOpen(true); }}>Edit Job</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(`${window.location.origin}/board/${job.id}`)
                        }}
                      >
                        Share job link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async (e) => {
                          e.stopPropagation()
                          const newStatus = job.status === "open" ? "inactive" : "open"
                          await fetch(`/api/jobs/${job.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) })
                          fetchJobs()
                        }}
                      >
                        Change status
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-lg line-clamp-1">{job.title}</CardTitle>
                <CardDescription className="line-clamp-1">
                  {(job.client_id && clientsById.get(job.client_id)?.name) || job.client_name ? (
                    <span className="mr-2">{(job.client_id && clientsById.get(job.client_id)?.name) || job.client_name}</span>
                  ) : null}
                  <span>{job.department}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5" />
                    {job.type}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 flex gap-2">
                <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); router.push(`/jobs/${job.id}?tab=all`) }}>
                  View Applicants ({appCounts[job.id] || 0}) {pendingCounts[job.id] ? ` • ${pendingCounts[job.id]} pending` : ""}
                </Button>
                <Button variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); window.open(`/jobs/${job.id}/matches`, '_blank') }}>
                  Database Matches ({dbMatchCounts[job.id] || 0})
                </Button>
              </CardFooter>
            </Card>
          ))}
          {filteredJobs.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No jobs found. Create one to get started.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
