import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartSearch } from "@/components/smart-search"

export default function SearchPage() {
  return (
    <Card className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
      <CardHeader>
        <CardTitle>Smart Resume Search</CardTitle>
        <CardDescription>AI-powered vector search to find the most relevant candidates for your requirements</CardDescription>
      </CardHeader>
      <CardContent>
        <SmartSearch />
      </CardContent>
    </Card>
  )
}

