import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { randomBytes } from "node:crypto"
import { sendInviteEmail } from "@/lib/mailer"

export const runtime = "nodejs"

function nowIso() {
  return new Date().toISOString()
}

function createToken() {
  return randomBytes(24).toString("base64url")
}

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("auth")
  const hrUserCookie = request.cookies.get("hr_user")
  if (!(authCookie?.value === "true" || hrUserCookie?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const jobId = url.searchParams.get("jobId")
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("job_invites")
    .select("id, job_id, candidate_id, email, token, status, sent_at, opened_at, responded_at, applied_at, rejected_at, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: "Failed to load invites" }, { status: 500 })
  return NextResponse.json({ invites: data || [] })
}

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("auth")
  const hrUserCookie = request.cookies.get("hr_user")
  if (!(authCookie?.value === "true" || hrUserCookie?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as any
  const jobId = typeof body?.jobId === "string" ? body.jobId : null
  const candidateId = typeof body?.candidateId === "string" ? body.candidateId : null
  const emailFromBody = typeof body?.email === "string" ? body.email.trim() : null
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
  if (!candidateId && !emailFromBody) return NextResponse.json({ error: "Missing candidateId/email" }, { status: 400 })

  let email = emailFromBody
  if (!email && candidateId) {
    const { data } = await supabaseAdmin.from("candidates").select("email").eq("id", candidateId).maybeSingle()
    email = (data?.email as string | undefined) || null
  }
  if (!email) return NextResponse.json({ error: "Candidate email not found" }, { status: 400 })

  const token = createToken()
  const now = nowIso()

  const { data: invite, error } = await supabaseAdmin
    .from("job_invites")
    .insert({
      job_id: jobId,
      candidate_id: candidateId,
      email,
      token,
      status: "sent",
      sent_at: now,
      created_at: now,
      updated_at: now,
      metadata: { source: "internal" }
    })
    .select("id, token")
    .single()

  if (error) return NextResponse.json({ error: "Failed to create invite" }, { status: 500 })

  const base = process.env.BOARD_APP_BASE_URL || process.env.NEXT_PUBLIC_BOARD_APP_BASE_URL
  const link = base ? `${base.replace(/\/$/, "")}/invite/${token}` : `/invite/${token}`

  let emailSent = false
  let emailError: string | null = null
  const from = process.env.INVITES_FROM || process.env.SMTP_USER || ""

  if (from) {
    const { data: job } = await supabaseAdmin.from("jobs").select("title").eq("id", jobId).maybeSingle()
    const jobTitle = (job?.title as string | undefined) || "a role"
    const subject = `Truckinzy: Invitation to apply — ${jobTitle}`

    try {
      await sendInviteEmail({
        to: email,
        from,
        subject,
        jobTitle,
        inviteLink: link
      })
      emailSent = true
    } catch (e: any) {
      emailError = e?.message || "Failed to send email"
    }
  }

  return NextResponse.json({ invite, link, emailSent, emailError })
}
