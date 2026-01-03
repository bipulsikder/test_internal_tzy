"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Search, Upload, Clock, Download, Filter, RefreshCw } from "lucide-react"

interface AnalyticsData {
  upload_count: number
  search_count: number
  recent_searches: {
    search_query: string
    created_at: string
    results_count: number
  }[]
  recent_uploads: {
    name: string
    created_at: string
    status: string
  }[]
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Detailed Logs State
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  useEffect(() => {
    fetchAnalytics()
    fetchLogs()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/hr/analytics")
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to fetch analytics")
      }
      const jsonData = await res.json()
      setData(jsonData)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load analytics data")
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
        const params = new URLSearchParams()
        if (startDate) params.set("startDate", startDate)
        if (endDate) params.set("endDate", endDate)
        
        const res = await fetch(`/api/hr/analytics/logs?${params.toString()}`)
        if (res.ok) {
            const data = await res.json()
            setLogs(data.logs || [])
        }
    } catch (error) {
        console.error("Failed to fetch logs", error)
    } finally {
        setLogsLoading(false)
    }
  }

  const downloadCSV = () => {
    if (!logs.length) return
    
    const headers = ["Date", "Search Query", "Results Count"]
    const csvContent = [
        headers.join(","),
        ...logs.map(log => [
            new Date(log.created_at).toLocaleString(),
            `"${(log.search_query || "").replace(/"/g, '""')}"`,
            log.results_count
        ].join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `search_logs_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.upload_count}</div>
            <p className="text-xs text-muted-foreground">Resumes uploaded by you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.search_count}</div>
            <p className="text-xs text-muted-foreground">Searches performed by you</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Searches
            </CardTitle>
            <CardDescription>Your last 5 searches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recent_searches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent searches</p>
              ) : (
                data.recent_searches.map((search, i) => (
                  <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{search.search_query || "All candidates"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(search.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {search.results_count} results
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Uploads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Recent Uploads
            </CardTitle>
            <CardDescription>Your last 5 uploads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recent_uploads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent uploads</p>
              ) : (
                data.recent_uploads.map((upload, i) => (
                  <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{upload.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(upload.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        upload.status === 'hired' ? 'bg-green-100 text-green-800' :
                        upload.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {upload.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Search Logs Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Detailed Search Logs
              </CardTitle>
              <CardDescription>View and download your search history</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2">
                <div className="grid gap-1">
                  <Label htmlFor="start-date" className="text-xs">From</Label>
                  <Input 
                    id="start-date" 
                    type="date" 
                    className="h-8 w-[130px]" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="end-date" className="text-xs">To</Label>
                  <Input 
                    id="end-date" 
                    type="date" 
                    className="h-8 w-[130px]" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading}>
                  {logsLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4 mr-2" />}
                  Filter
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCSV} disabled={logs.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Search Query</TableHead>
                  <TableHead>Results</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No search logs found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.search_query}</TableCell>
                      <TableCell>{log.results_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
