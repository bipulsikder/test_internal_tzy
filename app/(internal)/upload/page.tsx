import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadSection } from "@/components/upload-section"

export default function UploadPage() {
  return (
    <Card className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
      <CardHeader>
        <CardTitle>Resume Upload & Parsing</CardTitle>
        <CardDescription>Upload PDF, DOCX, DOC, or TXT resumes for automatic AI-powered data extraction</CardDescription>
      </CardHeader>
      <CardContent>
        <UploadSection />
      </CardContent>
    </Card>
  )
}

