import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const hrUserCookie = request.cookies.get("hr_user")?.value
    
    if (!hrUserCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let user: any
    try {
      user = JSON.parse(hrUserCookie)
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const hrId = String(user?.id || "").trim()
    if (!hrId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [{ count: uploadCount, error: uploadCountError }, { count: searchCount, error: searchCountError }] = await Promise.all([
      supabaseAdmin.from("candidates").select("id", { count: "exact", head: true }).eq("uploaded_by", hrId),
      supabaseAdmin.from("search_logs").select("id", { count: "exact", head: true }).eq("hr_user_id", hrId)
    ])

    if (uploadCountError || searchCountError) {
      return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
    }

    const [{ data: recentSearches, error: recentSearchesError }, { data: uploadLogs, error: uploadLogsError }] = await Promise.all([
      supabaseAdmin
        .from("search_logs")
        .select("search_query,created_at,results_count")
        .eq("hr_user_id", hrId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("upload_logs")
        .select("candidate_id,file_name,status,file_hash,created_at")
        .eq("hr_user_id", hrId)
        .order("created_at", { ascending: false })
        .limit(10)
    ])

    if (recentSearchesError || uploadLogsError) {
      return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
    }

    let legacyCandidates: any[] = []
    try {
      const { data: candidates } = await supabaseAdmin
        .from("candidates")
        .select("id,name,file_name,uploaded_at,updated_at,uploaded_by,file_hash")
        .eq("uploaded_by", hrId)
        .order("uploaded_at", { ascending: false })
        .limit(10)

      const seenCandidateIds = new Set<string>()
      const seenHashes = new Set<string>()
      ;(uploadLogs || []).forEach((l: any) => {
        if (l?.candidate_id) seenCandidateIds.add(String(l.candidate_id))
        if (l?.file_hash) seenHashes.add(String(l.file_hash))
      })

      legacyCandidates = (candidates || [])
        .filter((c: any) => {
          const cid = String(c.id)
          const h = c.file_hash ? String(c.file_hash) : ""
          if (seenCandidateIds.has(cid)) return false
          if (h && seenHashes.has(h)) return false
          return true
        })
        .map((c: any) => ({
          name: String(c.file_name || c.name || "Candidate"),
          created_at: c.uploaded_at || c.updated_at || null,
          status: "completed"
        }))
    } catch {
      legacyCandidates = []
    }

    const combinedUploads = [
      ...(uploadLogs || []).map((l: any) => ({
        name: String(l.file_name || "Upload"),
        created_at: l.created_at,
        status: String(l.status || "processing")
      })),
      ...legacyCandidates
    ]
      .filter((x) => x.created_at)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    return NextResponse.json({
      upload_count: uploadCount || 0,
      search_count: searchCount || 0,
      recent_searches: recentSearches || [],
      recent_uploads: combinedUploads
    })
  } catch (error) {
    console.error("Analytics exception:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
