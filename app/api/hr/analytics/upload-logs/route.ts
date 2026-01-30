import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

function monthBounds(month: string) {
  const [y, m] = month.split("-").map((x) => Number(x))
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const hrUserCookie = request.cookies.get("hr_user")?.value
    if (!hrUserCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let hrUser: any
    try {
      hrUser = JSON.parse(hrUserCookie)
    } catch (e) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 })
    }

    if (!hrUser || !hrUser.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const month = searchParams.get("month")
    const hrUserId = searchParams.get("hrUserId")

    const targetHrId = hrUserId && hrUserId.trim() ? hrUserId.trim() : hrUser.id
    if (targetHrId !== hrUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let fromIso: string | null = null
    let toIso: string | null = null

    if (startDate || endDate) {
      if (startDate) {
        fromIso = new Date(startDate).toISOString()
      }
      if (endDate) {
        const nextDay = new Date(endDate)
        nextDay.setDate(nextDay.getDate() + 1)
        toIso = nextDay.toISOString()
      }
    } else if (month) {
      const { start, end } = monthBounds(month)
      fromIso = start.toISOString()
      toIso = end.toISOString()
    } else {
      const now = new Date()
      const m = String(now.getUTCMonth() + 1).padStart(2, "0")
      const y = String(now.getUTCFullYear())
      const { start, end } = monthBounds(`${y}-${m}`)
      fromIso = start.toISOString()
      toIso = end.toISOString()
    }

    let query = supabaseAdmin
      .from("upload_logs")
      .select("*")
      .eq("hr_user_id", targetHrId)
      .order("created_at", { ascending: false })

    if (fromIso) {
      query = query.gte("created_at", fromIso)
    }
    if (toIso) {
      query = query.lt("created_at", toIso)
    }

    const { data: logs, error } = await query
    if (error) {
      return NextResponse.json({ error: "Failed to fetch upload logs" }, { status: 500 })
    }

    let legacyCandidates: any[] = []
    try {
      let candQuery = supabaseAdmin
        .from("candidates")
        .select(
          "id,file_name,file_type,file_size,uploaded_at,updated_at,uploaded_by,parsing_method,parsing_errors,file_hash",
        )
        .eq("uploaded_by", targetHrId)
        .order("uploaded_at", { ascending: false })

      if (fromIso) {
        candQuery = candQuery.gte("uploaded_at", fromIso)
      }
      if (toIso) {
        candQuery = candQuery.lt("uploaded_at", toIso)
      }

      const { data: candidates } = await candQuery

      const seenCandidateIds = new Set<string>()
      const seenHashes = new Set<string>()
      ;(logs || []).forEach((l: any) => {
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
          id: `legacy-${c.id}`,
          hr_user_id: c.uploaded_by,
          candidate_id: c.id,
          file_name: c.file_name,
          file_type: c.file_type,
          file_size: c.file_size,
          file_hash: c.file_hash,
          status: "completed",
          result_type: "legacy",
          parsing_method: c.parsing_method || "legacy",
          parsing_errors: c.parsing_errors || null,
          message: "Legacy upload (backfilled from candidates)",
          error_code: null,
          error_message: null,
          created_at: c.uploaded_at,
          updated_at: c.updated_at || c.uploaded_at,
        }))
    } catch (e) {
      legacyCandidates = []
    }

    const combined = [...(logs || []), ...legacyCandidates].sort((a: any, b: any) => {
      const ta = new Date(a.created_at).getTime()
      const tb = new Date(b.created_at).getTime()
      return tb - ta
    })

    const candidateIds = Array.from(
      new Set(
        combined
          .map((l: any) => (l?.candidate_id ? String(l.candidate_id) : ""))
          .filter((x: string) => x.length > 0),
      ),
    )

    let candidateUrlById = new Map<string, { file_url: string | null; file_name: string | null; file_type: string | null }>()
    if (candidateIds.length > 0) {
      const { data: candidates } = await supabaseAdmin
        .from("candidates")
        .select("id,file_url,file_name,file_type")
        .eq("uploaded_by", targetHrId)
        .in("id", candidateIds)

      ;(candidates || []).forEach((c: any) => {
        candidateUrlById.set(String(c.id), {
          file_url: c.file_url ?? null,
          file_name: c.file_name ?? null,
          file_type: c.file_type ?? null,
        })
      })
    }

    const enriched = combined.map((l: any) => {
      const cid = l?.candidate_id ? String(l.candidate_id) : ""
      const meta = cid ? candidateUrlById.get(cid) : undefined
      return {
        ...l,
        resume_url: meta?.file_url || null,
        resume_file_name: meta?.file_name || l?.file_name || null,
        resume_file_type: meta?.file_type || l?.file_type || null,
      }
    })

    return NextResponse.json({ logs: enriched })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
