"use client"

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, CheckCircle, XCircle, DollarSign, Clock } from 'lucide-react'

interface BulkUploadProps {
  onUploadComplete?: (results: any) => void
}

interface ParsingProgress {
  processed: number
  total: number
  current: string
}

interface CostEstimate {
  estimatedTokens: number
  estimatedCost: number
  breakdown: {
    inputCost: number
    outputCost: number
  }
}

export function BulkUpload({ onUploadComplete }: BulkUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<ParsingProgress | null>(null)
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    
    // Filter valid file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    
    const validFiles = selectedFiles.filter(file => allowedTypes.includes(file.type))
    const invalidFiles = selectedFiles.filter(file => !allowedTypes.includes(file.type))
    
    if (invalidFiles.length > 0) {
      setError(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}`)
      return
    }
    
    setFiles(validFiles)
    setError(null)
    
    // Calculate cost estimate
    const avgInputTokens = 2500
    const avgOutputTokens = 650
    const totalInputTokens = validFiles.length * avgInputTokens
    const totalOutputTokens = validFiles.length * avgOutputTokens
    const inputCost = (totalInputTokens / 1000000) * 0.10
    const outputCost = (totalOutputTokens / 1000000) * 0.40
    
    setCostEstimate({
      estimatedTokens: totalInputTokens + totalOutputTokens,
      estimatedCost: inputCost + outputCost,
      breakdown: { inputCost, outputCost }
    })
  }, [])

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    setError(null)
    setProgress({ processed: 0, total: files.length, current: 'Starting upload...' })

    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))

      const response = await fetch('/api/bulk-parse', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed')
      }

      setResults(data)
      onUploadComplete?.(data)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setProgress(null)
    }
  }

  const handleClear = () => {
    setFiles([])
    setResults(null)
    setError(null)
    setCostEstimate(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Resume Upload
          </CardTitle>
          <CardDescription>
            Upload multiple resume files for batch processing with Gemini AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <label htmlFor="file-upload" className="block text-sm font-medium">
              Select Resume Files
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500">
              Supported formats: PDF, DOC, DOCX, TXT (Max 10MB each)
            </p>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Selected Files ({files.length})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-gray-500">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Estimate */}
          {costEstimate && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Cost Estimate</span>
                </div>
                <div className="text-sm text-blue-800">
                  <div>Total tokens: {costEstimate.estimatedTokens.toLocaleString()}</div>
                  <div className="font-semibold">
                    Estimated cost: ${costEstimate.estimatedCost.toFixed(4)}
                  </div>
                  <div className="text-xs text-blue-600">
                    Input: ${costEstimate.breakdown.inputCost.toFixed(4)} | 
                    Output: ${costEstimate.breakdown.outputCost.toFixed(4)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {progress && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Processing...</span>
              </div>
              <Progress 
                value={(progress.processed / progress.total) * 100} 
                className="w-full"
              />
              <div className="text-sm text-gray-600">
                {progress.processed} of {progress.total} files processed
              </div>
              <div className="text-xs text-gray-500">
                {progress.current}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {results && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">
                    Processing completed: {results.results.successful} successful, {results.results.failed} failed
                  </div>
                  <div className="text-sm text-gray-600">
                    Total cost: ${results.costEstimate.estimatedCost.toFixed(4)}
                  </div>
                  {results.errors.length > 0 && (
                    <div className="text-sm text-red-600">
                      Errors: {results.errors.length}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || isUploading}
              className="flex-1"
            >
              {isUploading ? 'Processing...' : `Upload ${files.length} Files`}
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isUploading}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

