import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, MapPin, Briefcase, Clock, DollarSign, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { JobApplicationForm } from "@/components/job-application-form"

export const revalidate = 0

interface JobPageProps {
  params: {
    id: string
  }
}

export default async function JobPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const { data: job, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !job) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
            <Button variant="ghost" asChild>
              <Link href="/board" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                Back to Jobs
              </Link>
            </Button>
            <div className="hidden sm:block font-semibold text-gray-700">Truckinzy Careers</div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Job Header */}
          <div className="bg-white rounded-xl p-8 shadow-sm border space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="text-sm px-3 py-1">{job.department}</Badge>
                <Badge variant="outline" className="text-sm px-3 py-1">{job.type}</Badge>
                {job.status !== 'open' && (
                    <Badge variant="destructive" className="text-sm px-3 py-1">Closed</Badge>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{job.title}</h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <span>{job.salary_range || "Competitive Salary"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <section className="bg-white rounded-xl p-8 shadow-sm border space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  About the Role
                </h2>
                <div className="prose max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {job.description}
                </div>
              </section>

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <section className="bg-white rounded-xl p-8 shadow-sm border space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Requirements
                  </h2>
                  <ul className="space-y-3">
                    {job.requirements.map((req: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-gray-600">
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="lg:col-span-1">
              {/* Application Form Widget */}
              <div className="sticky top-24">
                <Card className="shadow-lg border-blue-100 overflow-hidden">
                  <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-6">
                    <CardTitle className="text-xl text-blue-900">Apply for this position</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {job.status === 'open' ? (
                        <JobApplicationForm jobId={job.id} jobTitle={job.title} />
                    ) : (
                        <div className="text-center py-6 text-gray-500">
                            This position is no longer accepting applications.
                        </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
