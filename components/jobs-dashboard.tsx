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
import { cachedFetchJson, getBoardJobApplyUrl, getSessionCached, invalidateSessionCache, peekSessionCache } from "@/lib/utils"

interface Job {
  id: string
  title: string
  location: string
  status: string
  description: string
  created_at: string
  apply_type?: string | null
  external_apply_url?: string | null
  client_name?: string
  client_id?: string | null
  industry?: string | null
  employment_type?: string | null
  shift_type?: string | null
  city?: string | null
  salary_type?: string | null
  salary_min?: number | null
  salary_max?: number | null
  openings?: number | null
  education_min?: string | null
  experience_min_years?: number | null
  experience_max_years?: number | null
  languages_required?: string[] | null
  english_level?: string | null
  license_type?: string | null
  age_min?: number | null
  age_max?: number | null
  gender_preference?: string | null
  role_category?: string | null
  department_category?: string | null
  skills_must_have?: string[] | null
  skills_good_to_have?: string[] | null
  sub_category?: string | null
}

export function JobsDashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [clients, setClients] = useState<{ id: string; name: string; slug: string; logo_url?: string | null }[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [appCounts, setAppCounts] = useState<Record<string, number>>({})
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({})
  const [dbMatchCounts, setDbMatchCounts] = useState<Record<string, number>>({})
  const router = useRouter()
  const jobsCacheKey = "internal:jobs:/api/jobs"
  const jobCountsCacheKey = "internal:jobs:counts"

  useEffect(() => {
    fetchJobs()
    fetchClients()
  }, [])

  const fetchClients = async (opts?: { force?: boolean }) => {
    try {
      const data = await cachedFetchJson<any[]>(`internal:jobs:/api/clients`, "/api/clients", undefined, {
        ttlMs: 10 * 60_000,
        force: Boolean(opts?.force),
      })
      setClients(Array.isArray(data) ? data.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug, logo_url: c.logo_url })) : [])
    } catch {
      setClients([])
    }
  }

  const applyCounts = (payload: { appCounts: Record<string, number>; pendingCounts: Record<string, number>; dbMatchCounts: Record<string, number> }) => {
    setAppCounts(payload.appCounts || {})
    setPendingCounts(payload.pendingCounts || {})
    setDbMatchCounts(payload.dbMatchCounts || {})
  }

  const fetchJobCounts = async (data: Job[], opts?: { force?: boolean }) => {
    if (!Array.isArray(data) || data.length === 0) {
      applyCounts({ appCounts: {}, pendingCounts: {}, dbMatchCounts: {} })
      return
    }
    const payload = await getSessionCached(
      jobCountsCacheKey,
      async () => {
        const counts: Record<string, number> = {}
        const pendings: Record<string, number> = {}
        const dbCounts: Record<string, number> = {}
        await Promise.all(
          (data || []).map(async (job: Job) => {
            try {
              const apps = await cachedFetchJson<any[]>(
                `internal:jobs:/api/applications?jobId=${job.id}`,
                `/api/applications?jobId=${job.id}`,
                undefined,
                { ttlMs: 60_000 },
              )
              counts[job.id] = apps.length
              pendings[job.id] = (apps || []).filter((a: any) => a.status === "applied").length
            } catch {}
            try {
              const dm = await cachedFetchJson<{ total: number }>(
                `internal:jobs:/api/jobs/${job.id}/matches?countOnly=1`,
                `/api/jobs/${job.id}/matches?countOnly=1`,
                undefined,
                { ttlMs: 60_000 },
              )
              dbCounts[job.id] = dm.total || 0
            } catch {}
          })
        )
        return { appCounts: counts, pendingCounts: pendings, dbMatchCounts: dbCounts }
      },
      { ttlMs: 60_000, force: Boolean(opts?.force) },
    )
    applyCounts(payload as { appCounts: Record<string, number>; pendingCounts: Record<string, number>; dbMatchCounts: Record<string, number> })
  }

  const fetchJobs = async (opts?: { force?: boolean }) => {
    const force = Boolean(opts?.force)
    const cachedJobs = !force ? peekSessionCache<Job[]>(jobsCacheKey) : null
    const cachedCounts = !force ? peekSessionCache<{ appCounts: Record<string, number>; pendingCounts: Record<string, number>; dbMatchCounts: Record<string, number> }>(jobCountsCacheKey) : null
    if (cachedJobs && cachedJobs.length) {
      setJobs(cachedJobs)
      setLoading(false)
    } else {
      setLoading(true)
    }
    if (cachedCounts) applyCounts(cachedCounts)
    try {
      const data = await cachedFetchJson<Job[]>(jobsCacheKey, "/api/jobs", undefined, {
        ttlMs: 2 * 60_000,
        force,
      })
      setJobs(data)
      await fetchJobCounts(data, { force })
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
        String(job.industry || "").toLowerCase().includes(q) ||
        String(job.location || "").toLowerCase().includes(q) ||
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
          onJobCreated={async () => {
            invalidateSessionCache("internal:jobs:", { prefix: true })
            invalidateSessionCache(jobCountsCacheKey)
            await fetchJobs({ force: true })
          }}
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
            onJobCreated={async () => {
              invalidateSessionCache("internal:jobs:", { prefix: true })
              invalidateSessionCache(jobCountsCacheKey)
              await fetchJobs({ force: true })
            }}
            jobId={editingJob.id}
            initialValues={{
              title: editingJob.title,
              industry: (editingJob as any).industry,
              location: editingJob.location,
              employment_type: (editingJob as any).employment_type,
              shift_type: (editingJob as any).shift_type,
              urgency_tag: (editingJob as any).urgency_tag,
              city: (editingJob as any).city,
              salary_type: (editingJob as any).salary_type,
              salary_min: (editingJob as any).salary_min,
              salary_max: (editingJob as any).salary_max,
              description: editingJob.description,
              openings: (editingJob as any).openings,
              client_name: (editingJob as any).client_name,
              client_id: (editingJob as any).client_id,
              apply_type: (editingJob as any).apply_type,
              external_apply_url: (editingJob as any).external_apply_url,
              skills_must_have: (editingJob as any).skills_must_have,
              skills_good_to_have: (editingJob as any).skills_good_to_have,
              sub_category: (editingJob as any).sub_category,
              education_min: (editingJob as any).education_min,
              experience_min_years: (editingJob as any).experience_min_years,
              experience_max_years: (editingJob as any).experience_max_years,
              languages_required: (editingJob as any).languages_required,
              english_level: (editingJob as any).english_level,
              license_type: (editingJob as any).license_type,
              age_min: (editingJob as any).age_min,
              age_max: (editingJob as any).age_max,
              gender_preference: (editingJob as any).gender_preference,
              role_category: (editingJob as any).role_category,
              department_category: (editingJob as any).department_category,
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
          {filteredJobs.map((job) => {
            const clientName = (job.client_id && clientsById.get(job.client_id)?.name) || job.client_name || ""
            const clientLogo = job.client_id ? (clientsById.get(job.client_id)?.logo_url || null) : null
            const pending = pendingCounts[job.id] || 0

            return (
              <Card
                key={job.id}
                className="cursor-pointer border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition flex flex-col"
                onClick={() => router.push(`/jobs/${job.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className={job.status === "open" ? "bg-green-600" : "bg-zinc-600"}>{job.status}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingJob(job)
                            setEditOpen(true)
                          }}
                        >
                          Edit Job
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(getBoardJobApplyUrl(job.id))
                          }}
                        >
                          Share job link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            const newStatus = job.status === "open" ? "inactive" : "open"
                            await fetch(`/api/jobs/${job.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: newStatus })
                            })
                            invalidateSessionCache("internal:jobs:", { prefix: true })
                            invalidateSessionCache(jobCountsCacheKey)
                            fetchJobs({ force: true })
                          }}
                        >
                          Change status
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CardTitle className="text-lg leading-snug line-clamp-1">{job.title}</CardTitle>

                  <CardDescription className="flex items-center gap-2 line-clamp-1">
                    {clientLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={String(clientLogo)} alt="Logo" className="h-5 w-5 rounded border bg-white object-contain p-0.5" />
                    ) : null}
                    {clientName ? <span className="font-medium text-zinc-700">{clientName}</span> : null}
                    {job.industry || job.department_category ? <span className="text-muted-foreground">•</span> : null}
                    <span>{job.industry || job.department_category || ""}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-3 flex-1">
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span className="truncate">{job.employment_type ? String(job.employment_type).replace(/_/g, " ") : "—"}</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/jobs/${job.id}?tab=all`)
                    }}
                  >
                    Applicants ({appCounts[job.id] || 0}){pending ? ` • ${pending} pending` : ""}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(`/jobs/${job.id}/matches`, "_blank")
                    }}
                  >
                    DB Matches ({dbMatchCounts[job.id] || 0})
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
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
