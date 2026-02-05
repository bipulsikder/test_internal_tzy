import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"
import { parseSearchRequirement } from "@/lib/intelligent-search"
import { generateCandidateSummary } from "@/lib/ai-summary"

export const runtime = "nodejs"

function isAuthed(request: NextRequest) {
  const authCookie = request.cookies.get("auth")?.value
  if (authCookie === "true") return true
  const authHeader = request.headers.get("authorization")
  return Boolean(authHeader?.startsWith("Bearer "))
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as any
  const candidateId = typeof body?.candidateId === "string" ? body.candidateId : ""
  const type = typeof body?.type === "string" ? body.type : "smart"
  const query = typeof body?.query === "string" ? body.query : ""
  const jd = typeof body?.jd === "string" ? body.jd : ""

  if (!candidateId) return NextResponse.json({ error: "Missing candidateId" }, { status: 400 })

  const { data: row, error } = await supabaseAdmin.from("candidates").select("*").eq("id", candidateId).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: "Candidate not found" }, { status: 404 })

  const candidate = SupabaseCandidateService.mapRowToCandidate(row as any)

  const searchText = type === "jd" ? jd : query
  const requirements = await parseSearchRequirement(String(searchText || "").trim())

  const summary = await generateCandidateSummary(candidate as any, requirements)
  return NextResponse.json({ candidateId, summary })
}

