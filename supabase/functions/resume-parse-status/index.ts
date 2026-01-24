import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return json(405, { error: "Method not allowed" })

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Missing Supabase env" })
  }

  const url = new URL(req.url)
  const parsing_job_id = url.searchParams.get("parsing_job_id")
  if (!parsing_job_id) return json(400, { error: "Missing parsing_job_id" })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase.from("parsing_jobs").select("*").eq("id", parsing_job_id).single()
  if (error) return json(404, { error: "Parsing job not found" })

  return json(200, { parsing_job: data })
})

