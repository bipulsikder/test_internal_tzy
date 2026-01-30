import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { parseSearchRequirement, intelligentCandidateSearch } from "@/lib/intelligent-search"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const perPage = parseInt(searchParams.get("perPage") || "20", 10)
    const countOnly = searchParams.get("countOnly") === "1"
    const forceRefresh = searchParams.get("refresh") === "1"

    const { data: job, error: jobErr } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single()
    if (jobErr || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Try to read cached matches if table exists
    let cached: any[] = []
    try {
      const { data: cachedData } = await supabase
        .from("job_matches")
        .select("*")
        .eq("job_id", id)
      cached = cachedData || []
    } catch (_ignore) {
      cached = []
    }

    if (countOnly) {
      return NextResponse.json({ total: cached.length })
    }

    let matches = cached
    if (!cached.length || forceRefresh) {
      // Compute matches using JD or title/requirements
      const baseText = [
        job.title || "",
        job.description || "",
        Array.isArray(job.requirements) ? job.requirements.join(", ") : (job.requirements || "")
      ].join("\n").trim()

      const candidates = await SupabaseCandidateService.getAllCandidates()
      const requirements = await parseSearchRequirement(baseText)
      const ranked = await intelligentCandidateSearch(requirements, candidates)

      matches = ranked.map((c: any) => ({
        job_id: id,
        candidate_id: c.id,
        relevance_score: c.relevanceScore || 0,
        match_summary: c.matchSummary || null,
        score_breakdown: c.scoreBreakdown || null,
        matching_keywords: c.matchingKeywords || [],
        source: "database",
        created_at: new Date().toISOString()
      }))

      // Persist if table exists
      try {
        const { error: insertErr } = await supabaseAdmin
          .from("job_matches")
          .upsert(matches, { onConflict: "job_id,candidate_id" })
        if (insertErr) {
          // If matching_keywords column is missing, retry without it
          if ((insertErr as any)?.code === 'PGRST204' || insertErr.message.includes("matching_keywords")) {
            console.warn("Retrying upsert without matching_keywords column...")
            const matchesNoKeywords = matches.map(({ matching_keywords, ...rest }: any) => rest)
            const { error: retryErr } = await supabaseAdmin
              .from("job_matches")
              .upsert(matchesNoKeywords, { onConflict: "job_id,candidate_id" })
            
            if (retryErr) console.warn("Retry failed:", retryErr.message)
          } else {
            console.warn("job_matches upsert failed:", insertErr.message)
          }
        }
      } catch (_ignore) {}
    }

    // Pagination
    const total = matches.length
    const start = (page - 1) * perPage
    const end = Math.min(start + perPage, total)
    const pageItems = matches.slice(start, end)

    // Hydrate candidate info for display
    let items = pageItems
    if (pageItems.length) {
      const ids = pageItems.map(m => m.candidate_id)
      try {
        const { data: cands } = await supabase
          .from("candidates")
          .select("*")
          .in("id", ids)
        const map = new Map((cands || []).map((c: any) => [c.id, SupabaseCandidateService.mapRowToCandidate(c)]))
        items = pageItems.map(m => ({ ...m, candidate: map.get(m.candidate_id) || null }))
      } catch (_ignore) {}
    }

    return NextResponse.json({ items, page, perPage, total })
  } catch (error) {
    console.error("Job matches error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
