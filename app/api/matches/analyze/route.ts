import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash"

export async function POST(request: NextRequest) {
  try {
    const { jobId, candidateId } = await request.json()
    
    if (!jobId || !candidateId) {
      return NextResponse.json({ error: "Missing jobId or candidateId" }, { status: 400 })
    }

    // 1. Fetch Job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("jobs")
      .select("title, description, requirements, department, location")
      .eq("id", jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // 2. Fetch Candidate
    const { data: candidate, error: candError } = await supabaseAdmin
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single()

    if (candError || !candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    // 3. Generate AI Analysis
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 })
    }

    const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL })
    
    const prompt = `
    You are an expert HR recruiter. Analyze the match between this candidate and job.
    
    JOB DETAILS:
    Title: ${job.title}
    Department: ${job.department}
    Location: ${job.location}
    Description: ${job.description?.substring(0, 500)}...
    Requirements: ${Array.isArray(job.requirements) ? job.requirements.join(", ") : job.requirements}

    CANDIDATE DETAILS:
    Name: ${candidate.name}
    Role: ${candidate.current_role}
    Experience: ${candidate.total_experience}
    Skills: ${Array.isArray(candidate.technical_skills) ? candidate.technical_skills.join(", ") : candidate.technical_skills}
    Summary: ${candidate.summary}

    TASK:
    Provide a concise analysis (max 3 paragraphs) covering:
    1. Why they are a good fit (Strengths)
    2. Potential gaps or areas to probe (Weaknesses)
    3. Final recommendation (Strong Match / Potential Match / Risky)

    Format as plain text or markdown.
    `

    const result = await model.generateContent(prompt)
    const analysis = result.response.text()

    // 4. Save to job_matches
    // We use upsert to ensure we don't create duplicates, but we only update match_summary
    // We assume the match row might already exist from the initial lightweight matching
    
    // First check if match exists to preserve other fields like relevance_score
    const { data: existingMatch } = await supabaseAdmin
        .from("job_matches")
        .select("*")
        .eq("job_id", jobId)
        .eq("candidate_id", candidateId)
        .single()
        
    const matchData = {
        job_id: jobId,
        candidate_id: candidateId,
        match_summary: analysis,
        // If it didn't exist (edge case), we might want to set other fields, but let's assume it exists or we just set what we have
        updated_at: new Date().toISOString()
    }

    if (existingMatch) {
        await supabaseAdmin
            .from("job_matches")
            .update({ match_summary: analysis, updated_at: new Date().toISOString() })
            .eq("job_id", jobId)
            .eq("candidate_id", candidateId)
    } else {
        await supabaseAdmin
            .from("job_matches")
            .insert(matchData)
    }

    return NextResponse.json({ summary: analysis })
  } catch (error: any) {
    console.error("AI Analysis error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
