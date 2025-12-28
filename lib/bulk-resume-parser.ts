import { GoogleGenerativeAI } from "@google/generative-ai"
import { parseResume } from "./resume-parser"
import { SupabaseCandidateService } from "./supabase-candidates"
import { supabaseAdmin } from "./supabase"

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null

interface BulkParsingJob {
  id: string
  totalFiles: number
  processedFiles: number
  successfulFiles: number
  failedFiles: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  errors: string[]
}

export class BulkResumeParser {
  private static readonly BATCH_SIZE = 10 // Process 10 resumes at a time
  private static readonly DELAY_BETWEEN_BATCHES = 2000 // 2 seconds delay
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 5000 // 5 seconds

  /**
   * Parse multiple resume files with rate limiting and error handling
   */
  static async parseBulkResumes(
    files: File[],
    onProgress?: (progress: { processed: number; total: number; current: string }) => void
  ): Promise<{
    successful: number
    failed: number
    errors: string[]
    candidateIds: string[]
  }> {
    console.log(`🚀 Starting bulk parsing of ${files.length} resumes...`)
    
    const jobId = `bulk_${Date.now()}`
    let successful = 0
    let failed = 0
    const errors: string[] = []
    const candidateIds: string[] = []

    try {
      // Create parsing job record
      await this.createParsingJob(jobId, files.length)

      // Process files in batches
      for (let i = 0; i < files.length; i += this.BATCH_SIZE) {
        const batch = files.slice(i, i + this.BATCH_SIZE)
        const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1
        const totalBatches = Math.ceil(files.length / this.BATCH_SIZE)

        console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)`)
        
        // Process batch with retry logic
        const batchResults = await this.processBatchWithRetry(batch, jobId)
        
        // Update counters
        successful += batchResults.successful
        failed += batchResults.failed
        errors.push(...batchResults.errors)
        candidateIds.push(...batchResults.candidateIds)

        // Update progress
        if (onProgress) {
          onProgress({
            processed: i + batch.length,
            total: files.length,
            current: `Batch ${batchNumber}/${totalBatches} completed`
          })
        }

        // Add delay between batches to respect rate limits
        if (i + this.BATCH_SIZE < files.length) {
          console.log(`⏳ Waiting ${this.DELAY_BETWEEN_BATCHES}ms before next batch...`)
          await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_BATCHES))
        }
      }

      // Update job status
      await this.updateParsingJob(jobId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        successfulFiles: successful,
        failedFiles: failed
      })

      console.log(`✅ Bulk parsing completed: ${successful} successful, ${failed} failed`)

      return {
        successful,
        failed,
        errors,
        candidateIds
      }

    } catch (error) {
      console.error('❌ Bulk parsing failed:', error)
      
      // Update job status
      await this.updateParsingJob(jobId, {
        status: 'failed',
        completedAt: new Date().toISOString()
      })

      throw error
    }
  }

  /**
   * Process a batch of files with retry logic
   */
  private static async processBatchWithRetry(
    files: File[],
    jobId: string
  ): Promise<{
    successful: number
    failed: number
    errors: string[]
    candidateIds: string[]
  }> {
    let successful = 0
    let failed = 0
    const errors: string[] = []
    const candidateIds: string[] = []

    // Process files in parallel within the batch
    const promises = files.map(async (file, index) => {
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          console.log(`  📄 Processing: ${file.name} (attempt ${attempt}/${this.MAX_RETRIES})`)
          
          // Parse resume
          const parsedData = await parseResume(file)
          
          // Upload file to Supabase Storage
          const fileUrl = await this.uploadFileToSupabase(file, parsedData.id || 'temp')
          
          // Add candidate to database
          const candidateId = await SupabaseCandidateService.addCandidate({
            ...parsedData,
            file_name: file.name,
            file_url: fileUrl,
            file_size: file.size,
            file_type: file.type,
            parsing_method: 'gemini',
            parsing_confidence: 0.95
          })

          // Record successful parsing
          await this.recordParsingJob(jobId, candidateId, file.name, 'completed')
          
          successful++
          candidateIds.push(candidateId)
          console.log(`    ✅ Success: ${file.name} (ID: ${candidateId})`)
          break

        } catch (error) {
          const errorMsg = `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(`    ❌ ${errorMsg} (attempt ${attempt}/${this.MAX_RETRIES})`)
          
          if (attempt === this.MAX_RETRIES) {
            // Final attempt failed
            failed++
            errors.push(errorMsg)
            
            // Record failed parsing
            await this.recordParsingJob(jobId, null, file.name, 'failed', errorMsg)
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt))
          }
        }
      }
    })

    // Wait for all files in batch to complete
    await Promise.all(promises)

    return { successful, failed, errors, candidateIds }
  }

  /**
   * Upload file to Supabase Storage
   */
  private static async uploadFileToSupabase(file: File, candidateId: string): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${candidateId}.${fileExt}`
    
    const { data, error } = await supabaseAdmin.storage
      .from('resume-files')
      .upload(fileName, file)

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('resume-files')
      .getPublicUrl(fileName)

    return publicUrl
  }

  /**
   * Create parsing job record
   */
  private static async createParsingJob(jobId: string, totalFiles: number): Promise<void> {
    await supabaseAdmin
      .from('parsing_jobs')
      .insert([{
        id: jobId,
        status: 'processing',
        parsing_method: 'gemini',
        started_at: new Date().toISOString()
      }])
  }

  /**
   * Update parsing job status
   */
  private static async updateParsingJob(
    jobId: string, 
    updates: Partial<{
      status: 'pending' | 'processing' | 'completed' | 'failed'
      completedAt: string
      successfulFiles: number
      failedFiles: number
    }>
  ): Promise<void> {
    await supabaseAdmin
      .from('parsing_jobs')
      .update(updates)
      .eq('id', jobId)
  }

  /**
   * Record individual file parsing result
   */
  private static async recordParsingJob(
    jobId: string,
    candidateId: string | null,
    fileName: string,
    status: 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    // This would create individual records for each file if needed
    console.log(`📝 Recorded ${status} for ${fileName}`)
  }

  /**
   * Get parsing job status
   */
  static async getParsingJobStatus(jobId: string): Promise<BulkParsingJob | null> {
    const { data, error } = await supabaseAdmin
      .from('parsing_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      console.error('Error fetching job status:', error)
      return null
    }

    return data as BulkParsingJob
  }

  /**
   * Get all parsing jobs
   */
  static async getAllParsingJobs(): Promise<BulkParsingJob[]> {
    const { data, error } = await supabaseAdmin
      .from('parsing_jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching parsing jobs:', error)
      return []
    }

    return data as BulkParsingJob[]
  }

  /**
   * Estimate cost for bulk parsing
   */
  static estimateCost(fileCount: number): {
    estimatedTokens: number
    estimatedCost: number
    breakdown: {
      inputCost: number
      outputCost: number
    }
  } {
    const avgInputTokens = 2500 // Average input tokens per resume
    const avgOutputTokens = 650 // Average output tokens per resume
    
    const totalInputTokens = fileCount * avgInputTokens
    const totalOutputTokens = fileCount * avgOutputTokens
    
    const inputCost = (totalInputTokens / 1000000) * 0.10 // $0.10 per 1M tokens
    const outputCost = (totalOutputTokens / 1000000) * 0.40 // $0.40 per 1M tokens
    
    return {
      estimatedTokens: totalInputTokens + totalOutputTokens,
      estimatedCost: inputCost + outputCost,
      breakdown: {
        inputCost,
        outputCost
      }
    }
  }
}

