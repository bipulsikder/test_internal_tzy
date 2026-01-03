"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadSection } from "@/components/upload-section"
import { CandidateDashboard } from "@/components/candidate-dashboard"
import { SmartSearch } from "@/components/smart-search"
import { JDGenerator } from "@/components/jd-generator"
import { AdminPanel } from "@/components/admin-panel"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const part = parts.pop();
    if (part) return part.split(';').shift() || null;
  }
  return null;
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  const [activeSection, setActiveSection] = useState("upload")
  const [isHrUser, setIsHrUser] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    // Redirect to /login if not authenticated
    if (getCookie("auth") !== "true") {
      router.replace("/login")
    }
    // Check if HR user
    if (getCookie("hr_user")) {
      setIsHrUser(true)
    }
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex min-h-screen w-full bg-gray-50 dark:bg-[#23272f]">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} isHrUser={isHrUser} />
      <main className="flex-1 min-h-screen w-full p-8 overflow-auto">
        {activeSection === "upload" && (
          <Card className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
            <CardHeader>
              <CardTitle>Resume Upload & Parsing</CardTitle>
              <CardDescription>
                Upload PDF, DOCX, DOC, or TXT resumes for automatic AI-powered data extraction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadSection />
            </CardContent>
          </Card>
        )}
        {activeSection === "candidates" && (
          <Card className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
            <CardHeader>
              <CardTitle>Candidate Dashboard</CardTitle>
              <CardDescription>
                View, filter, and manage all uploaded resumes with advanced search capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CandidateDashboard />
            </CardContent>
          </Card>
        )}
        {activeSection === "search" && (
          <Card className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
            <CardHeader>
              <CardTitle>Smart Resume Search</CardTitle>
              <CardDescription>
                AI-powered vector search to find the most relevant candidates for your requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SmartSearch />
            </CardContent>
          </Card>
        )}
        {activeSection === "jd-generator" && (
          <Card className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
            <CardHeader>
              <CardTitle>Job Description Generator</CardTitle>
              <CardDescription>
                Generate tailored job descriptions based on candidate profiles using AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JDGenerator />
            </CardContent>
          </Card>
        )}
        {activeSection === "analytics" && (
          <Card className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
            <CardHeader>
              <CardTitle>My Analytics</CardTitle>
              <CardDescription>
                Track your personal usage and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyticsDashboard />
            </CardContent>
          </Card>
        )}
        {activeSection === "admin" && (
          <Card className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
            <CardHeader>
              <CardTitle>Admin Panel</CardTitle>
              <CardDescription>Analytics, statistics, data export, and platform management tools</CardDescription>
            </CardHeader>
            <CardContent>
             <AdminPanel />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
