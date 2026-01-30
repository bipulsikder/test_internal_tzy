import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

function monthBounds(month: string) {
  const [y, m] = month.split("-").map((x) => Number(x))
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
  return { start, end }
}

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
    const month = searchParams.get('month')

    let fromIso: string | null = null
    let toIso: string | null = null

    if (startDate || endDate) {
      if (startDate) {
        fromIso = new Date(startDate).toISOString()
      }
      if (endDate) {
        const nextDay = new Date(endDate)
        nextDay.setDate(nextDay.getDate() + 1)
        toIso = nextDay.toISOString()
      }
    } else if (month) {
      const { start, end } = monthBounds(month)
      fromIso = start.toISOString()
      toIso = end.toISOString()
    } else {
      const now = new Date()
      const m = String(now.getUTCMonth() + 1).padStart(2, "0")
      const y = String(now.getUTCFullYear())
      const { start, end } = monthBounds(`${y}-${m}`)
      fromIso = start.toISOString()
      toIso = end.toISOString()
    }

    let query = supabaseAdmin
      .from('search_logs')
      .select('*')
      .eq('hr_user_id', hrUser.id)
      .order('created_at', { ascending: false })

    if (fromIso) {
      query = query.gte('created_at', fromIso)
    }

    if (toIso) {
      query = query.lt('created_at', toIso)
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
