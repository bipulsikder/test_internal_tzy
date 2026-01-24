import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { uploadFileToSupabase } from "@/lib/supabase-storage-utils"

export const runtime = "nodejs"

function requireAuth(request: NextRequest) {
  const authCookie = request.cookies.get("auth")?.value
  if (authCookie === "true") return true
  const authHeader = request.headers.get("authorization")
  return Boolean(authHeader?.startsWith("Bearer "))
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_")
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const form = await request.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 })

  const filePath = `clients/${id}/${Date.now()}_${sanitizeName(file.name)}`
  const { url } = await uploadFileToSupabase(file, filePath)

  const { data, error } = await supabaseAdmin
    .from("clients")
    .update({ logo_url: url, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ client: data, logo_url: url })
}

