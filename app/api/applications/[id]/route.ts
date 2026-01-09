import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const { id } = params
    const body = await request.json()
    const { status, notes } = body

    const { data, error } = await supabaseAdmin
      .from("applications")
      .update({ status, notes })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Update application error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
