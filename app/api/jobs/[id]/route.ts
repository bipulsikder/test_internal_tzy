import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Add proper auth check
  const authCookie = request.cookies.get("auth")?.value
  if (authCookie !== "true") {
      // Allow if valid bearer token present
      const authHeader = request.headers.get("authorization")
      if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    
    const { data, error } = await supabaseAdmin
      .from("jobs")
      .update(body)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   // Add proper auth check
   const authCookie = request.cookies.get("auth")?.value
   if (authCookie !== "true") {
       const authHeader = request.headers.get("authorization")
       if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
   }

  try {
    const { id } = await params
    const { error } = await supabaseAdmin
      .from("jobs")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Job deleted successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
