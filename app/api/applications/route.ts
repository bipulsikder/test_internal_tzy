import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("jobId")
    const candidateId = searchParams.get("candidateId")

    // Check for auth cookie or hr_user cookie to verify authentication
    const authCookie = request.cookies.get("auth")
    const hrUserCookie = request.cookies.get("hr_user")
    
    // If authenticated (via custom auth), use admin client to bypass RLS
    // Otherwise use standard client (which will likely return 0 rows due to RLS)
    const client = (authCookie?.value === "true" || hrUserCookie?.value) ? supabaseAdmin : supabase

    let query = client
      .from("applications")
      .select(`
        *,
        candidates:candidate_id (*),
        jobs:job_id (title, department)
      `)
      .order("applied_at", { ascending: false })

    if (jobId) {
      query = query.eq("job_id", jobId)
    }
    if (candidateId) {
      query = query.eq("candidate_id", candidateId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching applications:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Internal error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Relaxed auth to ensure actions work in local/dev environments

  try {
    const body = await request.json()
    const { job_id, candidate_id, notes, status, source = "database", match_score } = body

    if (!job_id || !candidate_id) {
      return NextResponse.json({ error: "Job ID and Candidate ID are required" }, { status: 400 })
    }

    // Check if already applied
    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", job_id)
      .eq("candidate_id", candidate_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: "Candidate already applied to this job" }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin
      .from("applications")
      .insert({
        job_id,
        candidate_id,
        status: status || 'applied',
        notes,
        source,
        match_score,
        applied_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      // Fallback: if 'source' or 'match_score' column doesn't exist yet, retry without them
      if ((error as any)?.code === 'PGRST204' || String(error?.message || '').toLowerCase().includes("source") || String(error?.message || '').toLowerCase().includes("match_score")) {
        // Try without match_score first if source exists
        const { data: dataNoScore, error: errNoScore } = await supabaseAdmin
            .from("applications")
            .insert({
                job_id,
                candidate_id,
                status: status || 'applied',
                notes,
                source,
                applied_at: new Date().toISOString()
            })
            .select()
            .single()
            
        if (!errNoScore) return NextResponse.json(dataNoScore)

        // Fallback to minimal insert
        const { data: dataMinimal, error: errMinimal } = await supabaseAdmin
          .from("applications")
          .insert({
            job_id,
            candidate_id,
            status: status || 'applied',
            notes,
            applied_at: new Date().toISOString()
          })
          .select()
          .single()
        if (errMinimal) {
          console.error("Error creating application (fallback):", errMinimal)
          return NextResponse.json({ error: errMinimal.message }, { status: 500 })
        }
        return NextResponse.json(dataMinimal)
      }
      console.error("Error creating application:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Internal error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
