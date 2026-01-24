import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { parseSearchRequirement, intelligentCandidateSearch } from "@/lib/intelligent-search"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let query = supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching jobs:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Internal error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Authorization check (simplified for now, ideally verify auth cookie or token)
  const authCookie = request.cookies.get("auth")?.value
  // Assuming 'true' means logged in HR/Admin for this context based on previous code
  if (authCookie !== "true") {
     // Also check for Bearer token for API calls
     const authHeader = request.headers.get("authorization")
     if (!authHeader?.startsWith("Bearer ")) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
     }
  }

  try {
    const body = await request.json()
    const { title, description, industry, sub_category, location, type, requirements, salary_range, status, positions, client_name, client_id, amount, skills_required, experience } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("jobs")
      .insert({
        title,
        description,
        department: industry, // Backward compat: map industry -> department
        sub_category: typeof sub_category === "string" && sub_category.length ? sub_category : null,
        location,
        type,
        requirements,
        salary_range,
        status: status || 'open',
        positions,
        client_name,
        client_id: typeof client_id === "string" && client_id.length ? client_id : null,
        amount: typeof amount === "string" && amount.length ? amount : null,
        skills_required: Array.isArray(skills_required) ? skills_required : null,
        experience
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating job:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger initial match generation (without heavy AI insights per candidate)
    try {
        console.log("Generating initial matches for job:", data.id)
        const baseText = [
            data.title || "",
            data.description || "",
            Array.isArray(data.requirements) ? data.requirements.join(", ") : (data.requirements || "")
        ].join("\n").trim()
        
        const candidates = await SupabaseCandidateService.getAllCandidates()
        // This uses Gemini only once to parse requirements, which is fast enough
        const parsedRequirements = await parseSearchRequirement(baseText)
        // This uses local scoring, very fast
        const ranked = await intelligentCandidateSearch(parsedRequirements, candidates)
        
        const matches = ranked.map((c: any) => ({
            job_id: data.id,
            candidate_id: c.id,
            relevance_score: c.relevanceScore || 0,
            match_summary: null, // No AI insight initially as requested
            score_breakdown: c.scoreBreakdown || null,
            source: "database",
            created_at: new Date().toISOString()
        }))
        
        if (matches.length > 0) {
             const { error: matchError } = await supabaseAdmin
                .from("job_matches")
                .upsert(matches, { onConflict: "job_id,candidate_id" })
             
             if (matchError) {
                 console.warn("Failed to store initial matches:", matchError)
             } else {
                 console.log(`Stored ${matches.length} initial matches for job ${data.id}`)
             }
        }
    } catch (matchErr) {
        console.error("Failed to generate initial matches:", matchErr)
        // Don't fail the job creation if matching fails
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Internal error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
