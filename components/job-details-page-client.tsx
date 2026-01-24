"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { JobDetails } from "@/components/job-details"

export function JobDetailsPageClient({ job }: { job: any }) {
  const router = useRouter()
  const sp = useSearchParams()
  const tab = sp.get("tab") || undefined
  return <JobDetails job={job} onBack={() => router.push("/jobs")} initialTab={tab} />
}

