import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ExternalLink } from "lucide-react"
import MatchesClient from "@/components/job-matches-client"

interface JobPageProps {
  params: Promise<{ id: string }>
}

export default async function MatchesPage(props: JobPageProps) {
  const { id } = await props.params
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="hidden sm:block font-semibold text-gray-700">Database Matches</div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-xl font-bold text-blue-700">{job?.title || "Matches"}</CardTitle>
              {job && (
                <>
                  <Badge variant="secondary" className="text-sm px-3 py-1">{job.department}</Badge>
                  <Badge variant="outline" className="text-sm px-3 py-1">{job.type}</Badge>
                  <span className="text-sm text-gray-500">{job.location}</span>
                  <a href={`/board/${id}`} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-blue-600 hover:underline">
                    View Public Page <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <MatchesClient jobId={id} />
          </div>
        </div>
      </main>
    </div>
  )
}
