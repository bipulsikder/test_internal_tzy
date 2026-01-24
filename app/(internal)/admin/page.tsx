import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminPanel } from "@/components/admin-panel"

export default function AdminPage() {
  return (
    <Card className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
      <CardHeader>
        <CardTitle>Admin Panel</CardTitle>
        <CardDescription>Analytics, statistics, data export, and platform management tools</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminPanel />
      </CardContent>
    </Card>
  )
}

