# 🚀 Complete Migration Guide: Google Sheets + Vercel Blob → Supabase

## 📋 Overview

This guide will help you migrate your Truckinzy platform from Google Sheets (database) + Vercel Blob (file storage) to Supabase (database + file storage + backend).

## 💰 Cost Analysis

### Google Gemini API Pricing (2024)
- **Gemini 2.0 Flash (Recommended)**
  - Input: $0.10 per 1M tokens
  - Output: $0.40 per 1M tokens
  - Context caching: $0.025 per 1M tokens

**Resume Parsing Cost Estimation:**
- Average resume: ~2,000 tokens input, ~500 tokens output
- Cost per resume: ~$0.0003 (less than 1 cent)
- 1,000 resumes: ~$0.30
- 10,000 resumes: ~$3.00

### Supabase Pricing
- **Free Tier**: 500MB database, 1GB file storage, 2GB bandwidth
- **Pro Tier**: $25/month - 8GB database, 100GB file storage, 250GB bandwidth
- **Team Tier**: $599/month - 8GB database, 100GB file storage, 1TB bandwidth

## 🛠️ Step-by-Step Migration Process

### Phase 1: Supabase Setup

#### 1.1 Create Supabase Account and Project

1. **Sign up at [supabase.com](https://supabase.com)**
   - Use GitHub, Google, or email
   - Verify your email if required

2. **Create New Project**
   - Click "New Project"
   - **Project Name**: `truckinzy-platform`
   - **Database Password**: Generate a strong password (save it securely!)
   - **Region**: Choose closest to your users (e.g., `us-east-1` for US)
   - **Pricing Plan**: Start with Free tier

3. **Wait for Project Setup** (2-3 minutes)

#### 1.2 Access SQL Editor

1. In your Supabase dashboard, click **"SQL Editor"** in the sidebar
2. Click **"New Query"** to create a new SQL script

#### 1.3 Create Database Schema

1. **Copy the entire content** from `supabase-migration-schema.sql`
2. **Paste it into the SQL Editor**
3. **Click "Run"** to execute the schema creation
4. **Verify tables are created** by checking the "Table Editor" tab

#### 1.4 Configure File Storage

1. Go to **"Storage"** in the sidebar
2. Click **"Create a new bucket"**
3. **Bucket Name**: `resume-files`
4. **Public bucket**: ✅ (checked)
5. **File size limit**: 10MB
6. **Allowed MIME types**: 
   ```
   application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain
   ```

#### 1.5 Set Up Row Level Security (RLS)

1. Go to **"Authentication"** → **"Policies"**
2. For each table, ensure RLS is enabled
3. Create policies based on your requirements (see schema file for examples)

### Phase 2: Environment Configuration

#### 2.1 Get Supabase Credentials

1. Go to **"Project Settings"** → **"API"**
2. Copy the following values:
   - **Project URL**
   - **anon public key**
   - **service_role key** (keep this secret!)

#### 2.2 Update Environment Variables

Create/update your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini API (keep existing)
GEMINI_API_KEY=your-gemini-api-key

# Remove these (no longer needed)
# GOOGLE_CLIENT_EMAIL=
# GOOGLE_PRIVATE_KEY=
# GOOGLE_SPREADSHEET_ID=
# BLOB_READ_WRITE_TOKEN=
```

### Phase 3: Install Supabase Dependencies

```bash
npm install @supabase/supabase-js @supabase/storage-js
```

### Phase 4: Create Supabase Client

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Phase 5: Data Migration

#### 5.1 Export Data from Google Sheets

1. **Open your Google Sheet**
2. **File** → **Download** → **Comma-separated values (.csv)**
3. **Save as**: `candidates_backup.csv`

#### 5.2 Create Migration Script

Create `scripts/migrate-to-supabase.ts`:

```typescript
import { supabaseAdmin } from '../lib/supabase'
import { getAllCandidates } from '../lib/google-sheets'
import fs from 'fs'
import csv from 'csv-parser'

async function migrateCandidates() {
  try {
    console.log('🚀 Starting migration from Google Sheets to Supabase...')
    
    // Get all candidates from Google Sheets
    const candidates = await getAllCandidates()
    console.log(`📊 Found ${candidates.length} candidates to migrate`)
    
    // Migrate candidates in batches
    const batchSize = 100
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize)
      
      const { data, error } = await supabaseAdmin
        .from('candidates')
        .insert(batch.map(candidate => ({
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          current_role: candidate.currentRole,
          location: candidate.location,
          total_experience: candidate.totalExperience,
          technical_skills: candidate.technicalSkills,
          soft_skills: candidate.softSkills,
          status: candidate.status,
          resume_text: candidate.resumeText,
          file_name: candidate.fileName,
          file_url: candidate.driveFileUrl,
          uploaded_at: candidate.uploadedAt,
          updated_at: candidate.updatedAt,
          // Add other fields as needed
        })))
      
      if (error) {
        console.error(`❌ Error migrating batch ${i}-${i + batchSize}:`, error)
      } else {
        console.log(`✅ Migrated batch ${i}-${i + batchSize}`)
      }
    }
    
    console.log('🎉 Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

migrateCandidates()
```

#### 5.3 Run Migration

```bash
npx tsx scripts/migrate-to-supabase.ts
```

### Phase 6: Update Application Code

#### 6.1 Create New Supabase Service

Create `lib/supabase-candidates.ts`:

```typescript
import { supabase, supabaseAdmin } from './supabase'
import { ComprehensiveCandidateData } from './google-sheets'

export class SupabaseCandidateService {
  // Get all candidates
  static async getAllCandidates(): Promise<ComprehensiveCandidateData[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('uploaded_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  // Add new candidate
  static async addCandidate(candidate: Omit<ComprehensiveCandidateData, 'id'>): Promise<string> {
    const { data, error } = await supabase
      .from('candidates')
      .insert([candidate])
      .select()
      .single()
    
    if (error) throw error
    return data.id
  }

  // Update candidate
  static async updateCandidate(id: string, updates: Partial<ComprehensiveCandidateData>): Promise<void> {
    const { error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', id)
    
    if (error) throw error
  }

  // Search candidates
  static async searchCandidates(query: string): Promise<ComprehensiveCandidateData[]> {
    const { data, error } = await supabase
      .rpc('search_candidates', { search_query: query })
    
    if (error) throw error
    return data || []
  }

  // Upload file to Supabase Storage
  static async uploadFile(file: File, candidateId: string): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${candidateId}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('resume-files')
      .upload(fileName, file)
    
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resume-files')
      .getPublicUrl(fileName)
    
    return publicUrl
  }
}
```

#### 6.2 Update API Routes

Update your API routes to use Supabase instead of Google Sheets:

```typescript
// app/api/candidates/route.ts
import { SupabaseCandidateService } from '@/lib/supabase-candidates'

export async function GET() {
  try {
    const candidates = await SupabaseCandidateService.getAllCandidates()
    return Response.json(candidates)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch candidates' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const candidate = await request.json()
    const id = await SupabaseCandidateService.addCandidate(candidate)
    return Response.json({ id })
  } catch (error) {
    return Response.json({ error: 'Failed to add candidate' }, { status: 500 })
  }
}
```

### Phase 7: Update Resume Parsing

#### 7.1 Create Supabase Resume Parser

Create `lib/supabase-resume-parser.ts`:

```typescript
import { parseResume } from './resume-parser'
import { SupabaseCandidateService } from './supabase-candidates'
import { supabaseAdmin } from './supabase'

export async function parseAndStoreResume(file: File): Promise<string> {
  try {
    // Parse resume using existing Gemini logic
    const parsedData = await parseResume(file)
    
    // Upload file to Supabase Storage
    const fileUrl = await SupabaseCandidateService.uploadFile(file, parsedData.id || 'temp')
    
    // Create parsing job record
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('parsing_jobs')
      .insert([{
        status: 'processing',
        parsing_method: 'gemini',
        started_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (jobError) throw jobError
    
    // Add candidate to database
    const candidateId = await SupabaseCandidateService.addCandidate({
      ...parsedData,
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      parsing_method: 'gemini',
      parsing_confidence: 0.95, // Adjust based on parsing quality
    })
    
    // Update parsing job
    await supabaseAdmin
      .from('parsing_jobs')
      .update({
        status: 'completed',
        candidate_id: candidateId,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobData.id)
    
    return candidateId
  } catch (error) {
    console.error('Failed to parse and store resume:', error)
    throw error
  }
}
```

### Phase 8: Testing and Validation

#### 8.1 Test Database Connection

```typescript
// Test script
import { supabase } from './lib/supabase'

async function testConnection() {
  const { data, error } = await supabase
    .from('candidates')
    .select('count')
    .limit(1)
  
  if (error) {
    console.error('❌ Database connection failed:', error)
  } else {
    console.log('✅ Database connection successful')
  }
}
```

#### 8.2 Test File Upload

```typescript
// Test file upload
import { SupabaseCandidateService } from './lib/supabase-candidates'

async function testFileUpload() {
  const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
  const url = await SupabaseCandidateService.uploadFile(testFile, 'test-id')
  console.log('File uploaded to:', url)
}
```

### Phase 9: Deployment

#### 9.1 Update Vercel Environment Variables

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the new Supabase variables
5. Remove the old Google Sheets variables

#### 9.2 Deploy and Test

```bash
npm run build
vercel --prod
```

### Phase 10: Cleanup

#### 10.1 Remove Old Dependencies

```bash
npm uninstall googleapis @vercel/blob
```

#### 10.2 Remove Old Files

- Delete `lib/google-sheets.ts`
- Delete `lib/vercel-blob-utils.ts`
- Update imports throughout your application

## 🔍 Monitoring and Maintenance

### 1. Database Monitoring

- Monitor database size in Supabase dashboard
- Set up alerts for storage limits
- Regular backup verification

### 2. File Storage Monitoring

- Monitor file storage usage
- Implement file cleanup policies
- Set up CDN for better performance

### 3. Performance Optimization

- Monitor query performance
- Add indexes as needed
- Implement caching strategies

## 🚨 Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Check if RLS policies are correctly configured
   - Verify user authentication

2. **File Upload Issues**
   - Check bucket permissions
   - Verify file size limits
   - Check MIME type restrictions

3. **Migration Data Issues**
   - Validate data types
   - Check for missing required fields
   - Verify JSONB format for array fields

### Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)
- [Supabase GitHub Issues](https://github.com/supabase/supabase/issues)

## 📊 Migration Checklist

- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] File storage bucket created
- [ ] Environment variables updated
- [ ] Dependencies installed
- [ ] Migration script created and tested
- [ ] Data migrated successfully
- [ ] Application code updated
- [ ] API routes updated
- [ ] Resume parsing updated
- [ ] Testing completed
- [ ] Production deployment
- [ ] Old dependencies removed
- [ ] Monitoring set up

## 🎉 Benefits of Migration

1. **Better Performance**: PostgreSQL is faster than Google Sheets
2. **Real-time Features**: Supabase provides real-time subscriptions
3. **Better Search**: Full-text search with PostgreSQL
4. **Scalability**: Handle more data and users
5. **Cost Efficiency**: Better pricing for larger datasets
6. **Developer Experience**: Better tooling and debugging
7. **Security**: Row-level security and better access control
8. **File Management**: Integrated file storage with CDN

---

**Need Help?** If you encounter any issues during migration, refer to the troubleshooting section or reach out to the Supabase community for support.

