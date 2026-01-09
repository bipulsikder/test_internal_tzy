import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    // 1. Check with standard client (subject to RLS)
    const { data: clientData, error: clientError, count: clientCount } = await supabase
      .from("applications")
      .select("*", { count: "exact" })

    // 2. Check with admin client (bypasses RLS)
    const { data: adminData, error: adminError, count: adminCount } = await supabaseAdmin
      .from("applications")
      .select("*", { count: "exact" })

    // 3. Check RLS policies if possible (or just infer from difference)
    
    return NextResponse.json({
      client: {
        count: clientCount,
        error: clientError,
        firstFew: clientData?.slice(0, 3)
      },
      admin: {
        count: adminCount,
        error: adminError,
        firstFew: adminData?.slice(0, 3)
      },
      diagnosis: clientCount !== adminCount ? "RLS Issue Likely" : "Counts Match"
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
