import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Call Supabase RPC to verify credentials
    const { data, error } = await supabase.rpc('verify_hr_credentials', {
      email_input: email,
      password_input: password
    })

    if (error) {
      console.error("Login error:", error)
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const user = data[0]

    // Create response with success message
    const response = NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })

    // Set auth cookies
    // 1. "auth=true" for existing middleware compatibility
    response.cookies.set("auth", "true", {
      httpOnly: false, // Allow client-side access for middleware checks
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    // 2. "hr_user" with user details for analytics tracking
    response.cookies.set("hr_user", JSON.stringify(user), {
      httpOnly: false, // Allow client-side access for Sidebar personalization
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    return response
  } catch (error) {
    console.error("Login exception:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
