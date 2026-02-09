"use client"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { RefreshCw, User, CheckCircle, MapPin, Briefcase, Eye, Loader2, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cachedFetchJson, invalidateSessionCache } from "@/lib/utils"

const CandidatePreviewDialogDynamic = dynamic(() => import("./candidate-preview-dialog").then(m => m.CandidatePreviewDialog), {
  ssr: false,
})

export default function MatchesClient({ jobId }: { jobId: string }) {
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [existingAppsByCandidateId, setExistingAppsByCandidateId] = useState<Record<string, { id: string; status: string }>>({})
  const [pendingCandidateIds, setPendingCandidateIds] = useState<Record<string, true>>({})

  const [aiByCandidateId, setAiByCandidateId] = useState<Record<string, { summary: string; expanded: boolean; visible: boolean }>>({})
  const [aiLoadingByCandidateId, setAiLoadingByCandidateId] = useState<Record<string, true>>({})

  const [manageOpen, setManageOpen] = useState(false)
  const [manageCandidateId, setManageCandidateId] = useState<string>("")
  const [manageCandidate, setManageCandidate] = useState<any | null>(null)
  const [manageScore, setManageScore] = useState<number>(0)
  const [manageStage, setManageStage] = useState<string>("shortlist")
  const [manageAction, setManageAction] = useState<"assign" | "invite" | "both">("assign")
  const [manageBusy, setManageBusy] = useState<boolean>(false)

  const STATUS_OPTIONS = [
    { id: "applied", label: "Applied" },
    { id: "shortlist", label: "Shortlist" },
    { id: "screening", label: "Screening" },
    { id: "interview", label: "Interview" },
    { id: "offer", label: "Offer" },
    { id: "hired", label: "Hired" },
    { id: "rejected", label: "Rejected" }
  ]

  const fetchMatches = async (opts?: { refresh?: boolean }) => {
    try {
      setLoading(true)
      const url = `/api/jobs/${jobId}/matches?page=${page}&perPage=${perPage}${opts?.refresh ? "&refresh=1" : ""}`
      const data = await cachedFetchJson<any>(
        `internal:job-matches:${jobId}:page:${page}:per:${perPage}:${opts?.refresh ? "refresh" : "base"}`,
        url,
        undefined,
        { ttlMs: 5 * 60_000, force: Boolean(opts?.refresh) },
      )
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (e) {
      toast({ title: "Error", description: "Failed to load matches", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, page, perPage])

  const refreshExistingApps = async () => {
    try {
      const rows = await cachedFetchJson<any[]>(
        `internal:applications:job:${jobId}`,
        `/api/applications?jobId=${jobId}`,
        undefined,
        { ttlMs: 5 * 60_000 },
      )
      const next: Record<string, { id: string; status: string }> = {}
      for (const row of Array.isArray(rows) ? rows : []) {
        const cid = String((row as any)?.candidate_id || "").trim()
        const id = String((row as any)?.id || "").trim()
        const status = String((row as any)?.status || "").trim()
        if (cid && id) next[cid] = { id, status }
      }
      setExistingAppsByCandidateId(next)
    } catch {
      setExistingAppsByCandidateId({})
    }
  }

  useEffect(() => {
    refreshExistingApps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const refreshMatches = async () => {
    try {
      setRefreshing(true)
      invalidateSessionCache(`internal:job-matches:${jobId}:`, { prefix: true })
      await fetchMatches({ refresh: true })
      toast({ title: "Database refreshed", description: "Matches recomputed and cached" })
    } catch (e) {
    } finally {
      setRefreshing(false)
    }
  }

  const openManage = (candidateId: string, candidate: any, score: number) => {
    const existing = existingAppsByCandidateId[candidateId]
    setManageCandidateId(candidateId)
    setManageCandidate(candidate)
    setManageScore(score)
    setManageStage(existing?.status || "shortlist")
    setManageAction("assign")
    setManageOpen(true)
  }

  const saveManage = async () => {
    if (!manageCandidateId) return
    const candidateId = manageCandidateId
    const existing = existingAppsByCandidateId[candidateId]
    const targetStage = manageStage
    const shouldAssign = manageAction !== "invite"
    const shouldInvite = manageAction !== "assign"

    setManageBusy(true)
    setPendingCandidateIds((prev) => ({ ...prev, [candidateId]: true }))
    try {
      if (shouldAssign) {
        if (existing?.id) {
          if (existing.status !== targetStage) {
            const res = await fetch(`/api/applications/${existing.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: targetStage })
            })
            if (!res.ok) throw new Error("Failed to update stage")
          }
        } else {
          const res = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              job_id: jobId,
              candidate_id: candidateId,
              source: "database",
              status: targetStage,
              match_score: manageScore
            })
          })

          if (res.status === 409) {
            await refreshExistingApps()
          } else if (!res.ok) {
            throw new Error("Failed to assign candidate")
          }
        }
      }

      if (shouldInvite) {
        const res = await fetch("/api/job-invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, candidateId, resend: true })
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || "Failed to create/send invite")
        if (shouldAssign) {
          toast({ title: "Saved", description: data?.emailSent ? "Assigned and invite email sent." : "Assigned and invite link ready." })
        } else {
          toast({ title: "Invite created", description: data?.emailSent ? "Invite email sent." : "Invite link ready." })
        }
      } else if (shouldAssign) {
        toast({ title: "Saved", description: "Candidate assigned successfully." })
      }

      invalidateSessionCache(`internal:applications:job:${jobId}`)
      invalidateSessionCache(`internal:job-invites:${jobId}`)
      await refreshExistingApps()
      setManageOpen(false)
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed", variant: "destructive" })
    } finally {
      setManageBusy(false)
      setPendingCandidateIds((prev) => {
        const next = { ...prev }
        delete next[candidateId]
        return next
      })
    }
  }

  const openPreview = async (candidate: any, score: number) => {
    try {
        setIsPreviewLoading(true)
        // Fetch complete candidate data if needed, or use existing
        const id = candidate._id || candidate.id
        if (id) {
            const res = await fetch(`/api/candidates/${id}`)
            if (res.ok) {
                const fullCandidateData = await res.json()
                setSelectedCandidate({
                    ...fullCandidateData,
                    matchPercentage: Math.round((score || 0) * 100)
                })
            } else {
                setSelectedCandidate({
                    ...candidate,
                    matchPercentage: Math.round((score || 0) * 100)
                })
            }
        } else {
             setSelectedCandidate({
                ...candidate,
                matchPercentage: Math.round((score || 0) * 100)
            })
        }
    } catch (e) {
        console.error("Error fetching candidate details:", e)
        setSelectedCandidate({
            ...candidate,
            matchPercentage: Math.round((score || 0) * 100)
        })
    } finally {
        setIsPreviewLoading(false)
    }
  }

  const getAvatarColor = (score: number) => {
    if (score >= 0.8) return "bg-green-500"
    if (score >= 0.5) return "bg-yellow-500"
    return "bg-gray-400"
  }

  const toggleAi = async (candidateId: string) => {
    if (!candidateId) return

    const existing = aiByCandidateId[candidateId]
    if (existing?.summary) {
      setAiByCandidateId((prev) => ({
        ...prev,
        [candidateId]: { ...prev[candidateId], visible: !prev[candidateId].visible }
      }))
      return
    }

    setAiLoadingByCandidateId((prev) => ({ ...prev, [candidateId]: true }))
    try {
      const res = await fetch("/api/matches/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, candidateId })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to generate analysis")
      setAiByCandidateId((prev) => ({
        ...prev,
        [candidateId]: { summary: String(data?.summary || ""), expanded: false, visible: true }
      }))
    } catch (e: any) {
      toast({ title: "AI analysis failed", description: e?.message || "Failed", variant: "destructive" })
    } finally {
      setAiLoadingByCandidateId((prev) => {
        const next = { ...prev }
        delete next[candidateId]
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">Total matches: {total}</div>
        <div className="flex items-center gap-2">
          <Select value={String(perPage)} onValueChange={(v) => setPerPage(parseInt(v))}>
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshMatches} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Database
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="text-center py-12 text-gray-500 flex flex-col items-center">
             <Loader2 className="h-8 w-8 animate-spin mb-2"/>
             Loading matches...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No matches found</div>
        ) : (
          items.map((m) => {
            const candidate = m.candidate || {}
            const score = m.relevance_score || 0
            const matchPercentage = Math.round(score * 100)
            const isAdded = !!existingAppsByCandidateId[m.candidate_id]
            const isPending = !!pendingCandidateIds[m.candidate_id]
            const addedStage = existingAppsByCandidateId[m.candidate_id]?.status || ""

            return (
              <Card key={`${m.job_id}-${m.candidate_id}`} className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {/* Avatar Section */}
                    <div className="flex-shrink-0">
                         <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                            <AvatarFallback className={`text-white ${getAvatarColor(score)}`}>
                                {candidate.name?.substring(0, 2).toUpperCase() || "CN"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="mt-2 text-center">
                            <Badge variant={score >= 0.8 ? "default" : score >= 0.5 ? "secondary" : "outline"} className="text-[10px] px-1 h-5">
                                {matchPercentage}%
                            </Badge>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-grow min-w-0 space-y-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-base truncate pr-2">{candidate.name || "Unknown Candidate"}</h3>
                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                    <Briefcase className="h-3.5 w-3.5 mr-1" />
                                    <span className="truncate max-w-[200px]">{candidate.current_role || "No role"}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-500 mt-0.5">
                                    <MapPin className="h-3.5 w-3.5 mr-1" />
                                    <span className="truncate">{candidate.location || "No location"}</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 flex-shrink-0">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8"
                                    onClick={() => openPreview(candidate, score)}
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  disabled={!!aiLoadingByCandidateId[m.candidate_id]}
                                  onClick={() => toggleAi(m.candidate_id)}
                                >
                                  {aiLoadingByCandidateId[m.candidate_id] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                  AI
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="h-8 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => openManage(m.candidate_id, candidate, score)}
                                    disabled={isPending}
                                >
                                    {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                    {isAdded ? "Manage" : "Associate"}
                                </Button>
                            </div>
                        </div>

                        {isAdded ? (
                          <div className="mt-2 text-xs text-gray-500">
                            In pipeline{addedStage ? ` • Stage: ${addedStage}` : ""}
                          </div>
                        ) : null}

                        {aiByCandidateId[m.candidate_id]?.summary && aiByCandidateId[m.candidate_id]?.visible ? (
                          <div className="mt-3 rounded-lg border bg-purple-50/40 p-3">
                            <div className="text-xs font-semibold text-purple-700 mb-1">AI Analysis</div>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                              {aiByCandidateId[m.candidate_id].expanded
                                ? aiByCandidateId[m.candidate_id].summary
                                : aiByCandidateId[m.candidate_id].summary.length > 260
                                  ? aiByCandidateId[m.candidate_id].summary.slice(0, 260) + "…"
                                  : aiByCandidateId[m.candidate_id].summary}
                            </div>
                            {aiByCandidateId[m.candidate_id].summary.length > 260 ? (
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() =>
                                    setAiByCandidateId((prev) => ({
                                      ...prev,
                                      [m.candidate_id]: { ...prev[m.candidate_id], expanded: !prev[m.candidate_id].expanded }
                                    }))
                                  }
                                >
                                  {aiByCandidateId[m.candidate_id].expanded ? "View less" : "View more"}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {/* AI Match Analysis (Compact) */}
                      {((m.matchDetails && m.matchDetails.length > 0) || m.match_summary || candidate.matchSummary) && (
                        <div className="mt-2 pt-2 border-t border-gray-100 bg-gray-50/30 p-2 rounded">
                          
                          {/* AI Insight Summary */}
                          {(m.match_summary || candidate.matchSummary) && (
                              <div className="mb-2 text-xs text-gray-700 bg-purple-50/50 p-2 rounded border border-purple-100">
                                  <span className="font-bold text-purple-700 mr-1">AI Insight:</span>
                                  {m.match_summary || candidate.matchSummary}
                              </div>
                          )}

                          {/* Score Bars (Compact) */}
                          {(m.score_breakdown || candidate.scoreBreakdown) && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                              {Object.entries(m.score_breakdown || candidate.scoreBreakdown || {}).map(([key, data]: [string, any]) => (
                                <div key={key} className="flex items-center text-[10px] w-[140px]">
                                  <span className="w-16 font-medium text-gray-500 truncate capitalize">{key.replace(/_/g, ' ')}</span>
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden mx-1">
                                    <div 
                                      className={`h-full rounded-full ${
                                        (typeof data === 'object' ? data.percentage : data) > 80 ? 'bg-green-500' : 
                                        (typeof data === 'object' ? data.percentage : data) > 40 ? 'bg-yellow-500' : 'bg-red-400'
                                      }`} 
                                      style={{ width: `${typeof data === 'object' ? data.percentage : data}%` }}
                                    />
                                  </div>
                                  <span className="text-gray-400">{typeof data === 'object' ? data.earned : data}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Key Matches & Gaps */}
                          <div className="mt-2 space-y-2">
                            <div>
                              {(m.matchDetails?.filter((d: any) => d.status === 'match').length > 0 || (candidate.matchDetails && candidate.matchDetails.filter((d: any) => d.status === 'match').length > 0)) ? (
                                <div className="text-sm text-green-700">
                                  <span className="font-semibold mr-1">✓ Matched:</span>
                                  {(m.matchDetails || candidate.matchDetails || []).filter((d: any) => d.status === 'match').map((d: any) => d.category).join(', ')}
                                </div>
                              ) : null}
                            </div>
                            <div>
                              {(m.gapAnalysis && m.gapAnalysis.length > 0) || (candidate.gapAnalysis && candidate.gapAnalysis.length > 0) || (m.matchDetails?.some((d: any) => d.status === 'miss') || candidate.matchDetails?.some((d: any) => d.status === 'miss')) ? (
                                <div className="text-sm text-red-700">
                                  <span className="font-semibold mr-1">✗ Missing:</span>
                                  {Array.from(new Set([
                                    ...(m.gapAnalysis || candidate.gapAnalysis || []),
                                    ...((m.matchDetails || candidate.matchDetails || []).filter((d: any) => d.status === 'miss').map((d: any) => d.category) || [])
                                  ])).join(', ')}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400 italic">No major gaps</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                        {/* Matching Keywords */}
                        {(m.matching_keywords || candidate.matchingKeywords || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                <span className="text-[10px] font-medium text-gray-500 self-center mr-1">Matched:</span>
                                {(m.matching_keywords || candidate.matchingKeywords || []).slice(0, 5).map((keyword: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal bg-green-50 text-green-700 border-green-200">
                                        {keyword}
                                    </Badge>
                                ))}
                                {(m.matching_keywords || candidate.matchingKeywords || []).length > 5 && (
                                    <span className="text-[10px] text-gray-400 self-center">+{ (m.matching_keywords || candidate.matchingKeywords || []).length - 5 } more</span>
                                )}
                            </div>
                        )}

                        {/* Skills/Tags if available (Fallback) */}
                        {(!(m.matching_keywords || candidate.matchingKeywords) || (m.matching_keywords || candidate.matchingKeywords).length === 0) && (candidate.skills || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {candidate.skills.slice(0, 3).map((skill: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal bg-gray-100 text-gray-600 hover:bg-gray-200">
                                        {skill}
                                    </Badge>
                                ))}
                                {candidate.skills.length > 3 && (
                                    <span className="text-[10px] text-gray-400 self-center">+{candidate.skills.length - 3} more</span>
                                )}
                            </div>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
        <div className="text-sm text-gray-600">Page {page}</div>
        <Button variant="outline" onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
      
      {selectedCandidate && (
        <CandidatePreviewDialogDynamic
          candidate={selectedCandidate}
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          jobId={jobId}
          showRelevanceScore={true}
        />
      )}

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Associate candidate</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <div className="text-sm font-medium">{manageCandidate?.name || "Candidate"}</div>
              {manageCandidate?.email ? <div className="mt-1 text-sm text-gray-500">{manageCandidate.email}</div> : null}
            </div>

            <div className="grid gap-2">
              <Label>Action</Label>
              <Select
                value={manageAction}
                onValueChange={(v) => setManageAction(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assign">Assign to pipeline (no invite)</SelectItem>
                  <SelectItem value="invite" disabled={!manageCandidate?.email}>Invite to apply only</SelectItem>
                  <SelectItem value="both" disabled={!manageCandidate?.email}>Assign + Invite</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-gray-500">
                Assigning controls pipeline stages. Invites are tracked separately in the Invites section.
              </div>
            </div>

            {manageAction !== "invite" ? (
              <div className="grid gap-2">
                <Label>Stage</Label>
                <Select value={manageStage} onValueChange={setManageStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-500">This controls where the candidate appears in your pipeline stages.</div>
              </div>
            ) : (
              <div className="rounded-lg border bg-gray-50 p-3 text-xs text-gray-600">
                Invite-only does not place the candidate into any pipeline stage.
              </div>
            )}

            {manageAction !== "assign" ? (
              <div className="rounded-lg border bg-blue-50 p-3 text-xs text-blue-700">
                {manageCandidate?.email ? "A tracked invite link will be created (and emailed if SMTP is configured)." : "Candidate email missing — invite disabled."}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)} disabled={manageBusy}>
              Cancel
            </Button>
            <Button onClick={saveManage} disabled={manageBusy || !manageCandidateId}>
              {manageBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
