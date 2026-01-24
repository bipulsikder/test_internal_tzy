import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { JobDetailsPageClient } from "@/components/job-details-page-client"

export const runtime = "nodejs"
export const revalidate = 0

export default async function JobDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle()
  if (!job) notFound()
  return <JobDetailsPageClient job={job} />
}

