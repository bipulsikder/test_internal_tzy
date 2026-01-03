import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const hrUserCookie = request.cookies.get("hr_user")?.value
    
    if (!hrUserCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = JSON.parse(hrUserCookie)
    const hrId = user.id

    // Call Supabase RPC to get analytics
    const { data, error } = await supabase.rpc('get_hr_analytics', {
      target_hr_id: hrId
    })

    if (error) {
      console.error("Analytics error:", error)
      return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Analytics exception:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
