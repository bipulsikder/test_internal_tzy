import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Briefcase, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"

export const revalidate = 0

export default async function JobBoard() {
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto py-6 px-4">
          <h1 className="text-2xl font-bold text-gray-900">Careers at Truckinzy</h1>
        </div>
      </header>

      <main className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Join Our Team</h2>
            <p className="text-xl text-gray-600">
              We are looking for talented individuals to help us revolutionize logistics.
            </p>
          </div>

          <div className="grid gap-6">
            {!jobs?.length ? (
              <div className="text-center py-12 text-gray-500">
                No open positions at the moment. Check back later!
              </div>
            ) : (
              jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl font-bold text-blue-700">{job.title}</CardTitle>
                        <p className="text-gray-500 mt-1">{job.department}</p>
                      </div>
                      <Badge variant="secondary">{job.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {job.salary_range || "Competitive"}
                      </div>
                    </div>
                    <p className="text-gray-600 line-clamp-2">{job.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full sm:w-auto">
                      <Link href={`/board/${job.id}`}>
                        View Details & Apply <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
