import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type RequestBody = {
  file_path: string
  candidate_id: string
  application_id?: string
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" })

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Missing Supabase env" })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return json(400, { error: "Invalid JSON" })
  }

  if (!body.file_path || !body.candidate_id) {
    return json(400, { error: "Missing file_path or candidate_id" })
  }

  const started_at = new Date().toISOString()
  const { data: parsingJob, error } = await supabase
    .from("parsing_jobs")
    .insert({
      candidate_id: body.candidate_id,
      status: "completed",
      parsing_method: "edge_stub",
      started_at,
      completed_at: started_at,
      created_at: started_at
    })
    .select("*")
    .single()

  if (error) return json(500, { error: "Failed to create parsing job" })

  return json(200, {
    parsing_job_id: parsingJob.id,
    status: parsingJob.status
  })
})

