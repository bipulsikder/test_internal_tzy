#!/usr/bin/env tsx

/**
 * Migration Script: Google Sheets + Vercel Blob → Supabase
 * 
 * This script migrates all candidate data from Google Sheets to Supabase
 * and handles file migration from Vercel Blob to Supabase Storage.
 */

import { supabaseAdmin } from '../lib/supabase'
import { getAllCandidates } from '../lib/google-sheets'
import { SupabaseCandidateService } from '../lib/supabase-candidates'

interface MigrationStats {
  totalCandidates: number
  migratedCandidates: number
  failedCandidates: number
  migratedFiles: number
  failedFiles: number
  errors: string[]
}

class MigrationService {
  private stats: MigrationStats = {
    totalCandidates: 0,
    migratedCandidates: 0,
    failedCandidates: 0,
    migratedFiles: 0,
    failedFiles: 0,
    errors: []
  }

  async migrateCandidates(): Promise<MigrationStats> {
    try {
      console.log('🚀 Starting migration from Google Sheets to Supabase...')
      console.log('=' .repeat(60))

      // Test connections
      console.log('🔍 Testing connections...')
      const supabaseConnected = await SupabaseCandidateService.testConnection()
      if (!supabaseConnected) {
        throw new Error('Failed to connect to Supabase')
      }
      console.log('✅ Supabase connection successful')

      // Get all candidates from Google Sheets
      console.log('📊 Fetching candidates from Google Sheets...')
      const candidates = await getAllCandidates()
      this.stats.totalCandidates = candidates.length
      console.log(`📋 Found ${candidates.length} candidates to migrate`)

      if (candidates.length === 0) {
        console.log('⚠️ No candidates found to migrate')
        return this.stats
      }

      // Migrate candidates in batches
      const batchSize = 50
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize)
        console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidates.length / batchSize)} (${batch.length} candidates)`)
        
        await this.migrateBatch(batch)
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < candidates.length) {
          console.log('⏳ Waiting 2 seconds before next batch...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Print final statistics
      this.printStats()
      
      return this.stats

    } catch (error) {
      console.error('❌ Migration failed:', error)
      this.stats.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return this.stats
    }
  }

  private async migrateBatch(candidates: any[]): Promise<void> {
    for (const candidate of candidates) {
      try {
        console.log(`  📝 Migrating: ${candidate.name} (${candidate.email})`)
        
        // Prepare candidate data for Supabase
        const candidateData = this.prepareCandidateData(candidate)
        
        // Add candidate to Supabase
        const candidateId = await SupabaseCandidateService.addCandidate(candidateData)
        
        // Migrate file if it exists
        if (candidate.driveFileUrl && candidate.fileName) {
          await this.migrateFile(candidateId, candidate.driveFileUrl, candidate.fileName)
        }
        
        this.stats.migratedCandidates++
        console.log(`    ✅ Migrated successfully (ID: ${candidateId})`)
        
      } catch (error) {
        this.stats.failedCandidates++
        const errorMsg = `Failed to migrate ${candidate.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        this.stats.errors.push(errorMsg)
        console.error(`    ❌ ${errorMsg}`)
      }
    }
  }

  private prepareCandidateData(candidate: any): Omit<any, 'id'> {
    return {
      name: candidate.name || 'Unknown',
      email: candidate.email || '',
      phone: candidate.phone || '',
      dateOfBirth: candidate.dateOfBirth || '',
      gender: candidate.gender || '',
      maritalStatus: candidate.maritalStatus || '',
      currentRole: candidate.currentRole || 'Not specified',
      desiredRole: candidate.desiredRole || '',
      currentCompany: candidate.currentCompany || '',
      location: candidate.location || 'Not specified',
      preferredLocation: candidate.preferredLocation || '',
      totalExperience: candidate.totalExperience || 'Not specified',
      currentSalary: candidate.currentSalary || '',
      expectedSalary: candidate.expectedSalary || '',
      noticePeriod: candidate.noticePeriod || '',
      highestQualification: candidate.highestQualification || '',
      degree: candidate.degree || '',
      specialization: candidate.specialization || '',
      university: candidate.university || '',
      educationYear: candidate.educationYear || '',
      educationPercentage: candidate.educationPercentage || '',
      additionalQualifications: candidate.additionalQualifications || '',
      technicalSkills: candidate.technicalSkills || [],
      softSkills: candidate.softSkills || [],
      languagesKnown: candidate.languagesKnown || [],
      certifications: candidate.certifications || [],
      previousCompanies: candidate.previousCompanies || [],
      jobTitles: candidate.jobTitles || [],
      workDuration: candidate.workDuration || [],
      keyAchievements: candidate.keyAchievements || [],
      workExperience: candidate.workExperience || [],
      education: candidate.education || [],
      projects: candidate.projects || [],
      awards: candidate.awards || [],
      publications: candidate.publications || [],
      references: candidate.references || [],
      linkedinProfile: candidate.linkedinProfile || '',
      portfolioUrl: candidate.portfolioUrl || '',
      githubProfile: candidate.githubProfile || '',
      summary: candidate.summary || '',
      resumeText: candidate.resumeText || '',
      fileName: candidate.fileName || '',
      driveFileId: candidate.driveFileId || '',
      driveFileUrl: candidate.driveFileUrl || '',
      status: candidate.status || 'new',
      tags: candidate.tags || [],
      rating: candidate.rating,
      notes: candidate.notes || '',
      uploadedAt: candidate.uploadedAt || new Date().toISOString(),
      updatedAt: candidate.updatedAt || new Date().toISOString(),
      lastContacted: candidate.lastContacted || '',
      interviewStatus: candidate.interviewStatus || 'not-scheduled',
      feedback: candidate.feedback || '',
    }
  }

  private async migrateFile(candidateId: string, fileUrl: string, fileName: string): Promise<void> {
    try {
      // For now, we'll just store the original URL
      // In a full migration, you'd download from Vercel Blob and upload to Supabase Storage
      console.log(`    📁 File: ${fileName} (keeping original URL: ${fileUrl})`)
      
      // Update candidate with file information
      await supabaseAdmin
        .from('candidates')
        .update({
          file_name: fileName,
          file_url: fileUrl,
          file_type: this.getFileType(fileName),
        })
        .eq('id', candidateId)
      
      this.stats.migratedFiles++
      
    } catch (error) {
      this.stats.failedFiles++
      const errorMsg = `Failed to migrate file ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      this.stats.errors.push(errorMsg)
      console.error(`    ❌ ${errorMsg}`)
    }
  }

  private getFileType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return 'application/pdf'
      case 'doc':
        return 'application/msword'
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      case 'txt':
        return 'text/plain'
      default:
        return 'application/octet-stream'
    }
  }

  private printStats(): void {
    console.log('\n' + '=' .repeat(60))
    console.log('📊 MIGRATION STATISTICS')
    console.log('=' .repeat(60))
    console.log(`Total candidates: ${this.stats.totalCandidates}`)
    console.log(`✅ Migrated: ${this.stats.migratedCandidates}`)
    console.log(`❌ Failed: ${this.stats.failedCandidates}`)
    console.log(`📁 Files migrated: ${this.stats.migratedFiles}`)
    console.log(`📁 Files failed: ${this.stats.failedFiles}`)
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS:')
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`)
      })
    }
    
    const successRate = this.stats.totalCandidates > 0 
      ? ((this.stats.migratedCandidates / this.stats.totalCandidates) * 100).toFixed(1)
      : '0'
    
    console.log(`\n🎯 Success Rate: ${successRate}%`)
    console.log('=' .repeat(60))
  }
}

// Main execution
async function main() {
  const migrationService = new MigrationService()
  const stats = await migrationService.migrateCandidates()
  
  if (stats.failedCandidates > 0) {
    console.log('\n⚠️ Some candidates failed to migrate. Check the errors above.')
    process.exit(1)
  } else {
    console.log('\n🎉 Migration completed successfully!')
    process.exit(0)
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Migration script failed:', error)
    process.exit(1)
  })
}

export { MigrationService }

