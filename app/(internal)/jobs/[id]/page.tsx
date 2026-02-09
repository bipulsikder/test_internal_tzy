import { JobDetailsPageClient } from "@/components/job-details-page-client"

export const runtime = "nodejs"
export const revalidate = 0

export default async function JobDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return <JobDetailsPageClient jobId={id} />
}
