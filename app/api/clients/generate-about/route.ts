import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

function requireAuth(request: NextRequest) {
  const authCookie = request.cookies.get("auth")?.value
  if (authCookie === "true") return true
  const authHeader = request.headers.get("authorization")
  return Boolean(authHeader?.startsWith("Bearer "))
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchWebsiteText(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Truckinzy/1.0 (About generator)"
      },
      signal: controller.signal
    })

    if (!res.ok) return { ok: false as const, status: res.status, text: "" }
    const contentType = res.headers.get("content-type") || ""
    const body = await res.text()
    if (contentType.includes("text/html")) return { ok: true as const, status: res.status, text: stripHtml(body) }
    return { ok: true as const, status: res.status, text: body.replace(/\s+/g, " ").trim() }
  } catch (e: any) {
    return { ok: false as const, status: 0, text: "", error: e?.name === "AbortError" ? "Timeout" : e?.message || "Fetch failed" }
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchWebsiteTextWithFallback(url: string) {
  const direct = await fetchWebsiteText(url)
  if (direct.ok && direct.text && direct.text.length > 500) return { sourceUrl: url, text: direct.text }

  const altUrl = `https://r.jina.ai/${url}`
  const viaJina = await fetchWebsiteText(altUrl)
  if (viaJina.ok && viaJina.text && viaJina.text.length > 500) {
    return { sourceUrl: url, text: viaJina.text }
  }

  if (direct.ok && direct.text) return { sourceUrl: url, text: direct.text }
  if (viaJina.ok && viaJina.text) return { sourceUrl: url, text: viaJina.text }

  const reason = (direct as any).error || (viaJina as any).error || "Failed to fetch website"
  throw new Error(reason)
}

function normalizeWebsite(input: string) {
  const raw = input.trim()
  if (!raw) return null
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  return `https://${raw}`
}

async function pickGeminiModelName(apiKey: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  if (!res.ok) throw new Error("Gemini models list failed")
  const json = (await res.json().catch(() => null)) as any
  const models = Array.isArray(json?.models) ? (json.models as any[]) : []
  const supportsGenerate = models.filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
  const names = supportsGenerate.map((m) => m.name).filter((n) => typeof n === "string") as string[]
  const prefer = [
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-lite",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro",
    "models/gemini-pro"
  ]
  for (const p of prefer) {
    const hit = names.find((n) => n === p)
    if (hit) return hit
  }
  const flash = names.find((n) => n.includes("flash"))
  if (flash) return flash
  if (names[0]) return names[0]
  throw new Error("No Gemini model supports generateContent")
}

async function geminiGenerateText(apiKey: string, prompt: string) {
  const modelName = await pickGeminiModelName(apiKey)
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 320 }
    })
  })
  const json = (await res.json().catch(() => null)) as any
  if (!res.ok) {
    const msg = json?.error?.message || "Gemini generateContent failed"
    throw new Error(msg)
  }
  const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n")
  return typeof text === "string" ? text.trim() : ""
}

export async function POST(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 })

  const body = (await request.json().catch(() => null)) as any
  const website = typeof body?.website === "string" ? normalizeWebsite(body.website) : null
  if (!website) return NextResponse.json({ error: "Website is required" }, { status: 400 })

  try {
    const { text, sourceUrl } = await fetchWebsiteTextWithFallback(website)
    const excerpt = text.slice(0, 14000)

    const prompt = [
      "You are writing an 'About the company' section for a hiring marketplace.",
      "Use ONLY facts you can infer from the provided website text. Do NOT invent numbers, customers, awards, funding, or claims.",
      "If something is unknown, omit it.",
      "Write 90-140 words, crisp, credible, and candidate-facing.",
      "Avoid hypey marketing superlatives. No fake things.",
      "Return plain text only.",
      "",
      `Website: ${sourceUrl}`,
      "",
      "Website text (excerpt):",
      excerpt
    ].join("\n")

    const about = await geminiGenerateText(process.env.GEMINI_API_KEY, prompt)

    if (!about) return NextResponse.json({ error: "No content generated" }, { status: 500 })
    return NextResponse.json({ about, sourceUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to generate" }, { status: 500 })
  }
}
