import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const hrUserCookie = request.cookies.get("hr_user")?.value
    if (!hrUserCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let hrUser;
    try {
      hrUser = JSON.parse(hrUserCookie)
    } catch (e) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 })
    }

    if (!hrUser || !hrUser.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let query = supabaseAdmin
      .from('search_logs')
      .select('*')
      .eq('hr_user_id', hrUser.id)
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString())
    }
    
    if (endDate) {
      // Add one day to end date to include the full day
      const nextDay = new Date(endDate)
      nextDay.setDate(nextDay.getDate() + 1)
      query = query.lt('created_at', nextDay.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching search logs:", error)
      throw error
    }

    return NextResponse.json({ logs: data })
  } catch (error) {
    console.error("Analytics logs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
