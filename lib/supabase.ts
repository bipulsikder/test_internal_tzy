import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side operations that require elevated permissions
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Ensure the resume-files bucket exists
export async function ensureResumeBucketExists() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    
    if (listError) {
      console.error('Error checking buckets:', listError)
      throw listError
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'resume-files')
    
    if (!bucketExists) {
      console.log('Creating resume-files bucket...')
      const { error: createError } = await supabaseAdmin.storage.createBucket('resume-files', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']
      })
      
      if (createError) {
        console.error('Error creating bucket:', createError)
        throw createError
      }
      
      console.log('✅ resume-files bucket created successfully')
    } else {
      console.log('✅ resume-files bucket already exists')
    }
    
    return true
  } catch (error) {
    console.error('Failed to ensure resume bucket exists:', error)
    return false
  }
}

// Database types (generated from your schema)
export interface Database {
  public: {
    Tables: {
      candidates: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          date_of_birth: string | null
          gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null
          marital_status: 'single' | 'married' | 'divorced' | 'widowed' | null
          current_role: string
          desired_role: string | null
          current_company: string | null
          location: string
          preferred_location: string | null
          total_experience: string
          current_salary: string | null
          expected_salary: string | null
          notice_period: string | null
          highest_qualification: string | null
          degree: string | null
          specialization: string | null
          university: string | null
          education_year: string | null
          education_percentage: string | null
          additional_qualifications: string | null
          technical_skills: any[]
          soft_skills: any[]
          languages_known: any[]
          certifications: any[]
          previous_companies: any[]
          job_titles: any[]
          work_duration: any[]
          key_achievements: any[]
          projects: any[]
          awards: any[]
          publications: any[]
          references: any[]
          linkedin_profile: string | null
          portfolio_url: string | null
          github_profile: string | null
          summary: string | null
          resume_text: string | null
          file_name: string | null
          file_url: string | null
          file_hash: string | null
          file_size: number | null
          file_type: string | null
          status: 'new' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired' | 'interviewed' | 'selected' | 'on-hold'
          tags: string[]
          rating: number | null
          notes: string | null
          uploaded_at: string
          updated_at: string
          last_contacted: string | null
          interview_status: 'not-scheduled' | 'scheduled' | 'completed' | 'offered' | 'accepted' | 'declined' | 'no-show' | 'rescheduled' | null
          feedback: string | null
          parsing_method: 'gemini' | 'openai' | 'manual' | null
          parsing_confidence: number | null
          parsing_errors: any[] | null
          uploaded_by: string | null
          search_vector: any
          embedding: any // vector
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null
          marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | null
          current_role: string
          desired_role?: string | null
          current_company?: string | null
          location: string
          preferred_location?: string | null
          total_experience: string
          current_salary?: string | null
          expected_salary?: string | null
          notice_period?: string | null
          highest_qualification?: string | null
          degree?: string | null
          specialization?: string | null
          university?: string | null
          education_year?: string | null
          education_percentage?: string | null
          additional_qualifications?: string | null
          technical_skills?: any[]
          soft_skills?: any[]
          languages_known?: any[]
          certifications?: any[]
          previous_companies?: any[]
          job_titles?: any[]
          work_duration?: any[]
          key_achievements?: any[]
          projects?: any[]
          awards?: any[]
          publications?: any[]
          references?: any[]
          linkedin_profile?: string | null
          portfolio_url?: string | null
          github_profile?: string | null
          summary?: string | null
          resume_text?: string | null
          file_name?: string | null
          file_url?: string | null
          file_hash?: string | null
          file_size?: number | null
          file_type?: string | null
          status?: 'new' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired' | 'interviewed' | 'selected' | 'on-hold' | 'offered' | 'accepted' | 'declined'
          tags?: string[]
          rating?: number | null
          notes?: string | null
          uploaded_at?: string
          updated_at?: string
          last_contacted?: string | null
          interview_status?: 'not-scheduled' | 'scheduled' | 'completed' | 'offered' | 'accepted' | 'declined' | 'no-show' | 'rescheduled' | null
          feedback?: string | null
          parsing_method?: 'gemini' | 'openai' | 'manual' | null
          parsing_confidence?: number | null
          parsing_errors?: any[] | null
          uploaded_by?: string | null
          embedding?: any // vector(768)
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null
          marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | null
          current_role?: string
          desired_role?: string | null
          current_company?: string | null
          location?: string
          preferred_location?: string | null
          total_experience?: string
          current_salary?: string | null
          expected_salary?: string | null
          notice_period?: string | null
          highest_qualification?: string | null
          degree?: string | null
          specialization?: string | null
          university?: string | null
          education_year?: string | null
          education_percentage?: string | null
          additional_qualifications?: string | null
          technical_skills?: any[]
          soft_skills?: any[]
          languages_known?: any[]
          certifications?: any[]
          previous_companies?: any[]
          job_titles?: any[]
          work_duration?: any[]
          key_achievements?: any[]
          projects?: any[]
          awards?: any[]
          publications?: any[]
          references?: any[]
          linkedin_profile?: string | null
          portfolio_url?: string | null
          github_profile?: string | null
          summary?: string | null
          resume_text?: string | null
          file_name?: string | null
          file_url?: string | null
          file_hash?: string | null
          file_size?: number | null
          file_type?: string | null
          status?: 'new' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired' | 'interviewed' | 'selected' | 'on-hold'
          tags?: string[]
          rating?: number | null
          notes?: string | null
          uploaded_at?: string
          updated_at?: string
          last_contacted?: string | null
          interview_status?: 'not-scheduled' | 'scheduled' | 'completed' | 'offered' | 'accepted' | 'declined' | 'no-show' | 'rescheduled' | null
          feedback?: string | null
          parsing_method?: 'gemini' | 'openai' | 'manual' | null
          parsing_confidence?: number | null
          parsing_errors?: any[] | null
          uploaded_by?: string | null
          embedding?: any // vector(1536)
        }
      }
      work_experience: {
        Row: {
          id: string
          candidate_id: string
          company: string
          role: string
          duration: string
          description: string | null
          start_date: string | null
          end_date: string | null
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          company: string
          role: string
          duration: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          is_current?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          company?: string
          role?: string
          duration?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          is_current?: boolean
          created_at?: string
        }
      }
      education: {
        Row: {
          id: string
          candidate_id: string
          degree: string
          specialization: string | null
          institution: string
          year: string | null
          percentage: string | null
          is_highest: boolean
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          degree: string
          specialization?: string | null
          institution: string
          year?: string | null
          percentage?: string | null
          is_highest?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          degree?: string
          specialization?: string | null
          institution?: string
          year?: string | null
          percentage?: string | null
          is_highest?: boolean
          created_at?: string
        }
      }
      file_storage: {
        Row: {
          id: string
          candidate_id: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          storage_provider: string
          original_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          storage_provider?: string
          original_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          file_name?: string
          file_url?: string
          file_size?: number
          file_type?: string
          storage_provider?: string
          original_path?: string | null
          created_at?: string
        }
      }
      parsing_jobs: {
        Row: {
          id: string
          candidate_id: string | null
          file_id: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          parsing_method: string
          input_tokens: number | null
          output_tokens: number | null
          cost_usd: number | null
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id?: string | null
          file_id?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          parsing_method: string
          input_tokens?: number | null
          output_tokens?: number | null
          cost_usd?: number | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string | null
          file_id?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          parsing_method?: string
          input_tokens?: number | null
          output_tokens?: number | null
          cost_usd?: number | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      hr_users: {
        Row: {
          id: string
          email: string
          password_hash: string
          name: string | null
          created_at: string
          last_login: string | null
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          name?: string | null
          created_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          name?: string | null
          created_at?: string
          last_login?: string | null
        }
      }
      search_logs: {
        Row: {
          id: string
          hr_user_id: string | null
          search_query: string | null
          filters: any | null
          results_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          hr_user_id?: string | null
          search_query?: string | null
          filters?: any | null
          results_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          hr_user_id?: string | null
          search_query?: string | null
          filters?: any | null
          results_count?: number | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_candidates: {
        Args: {
          search_query: string
        }
        Returns: {
          id: string
          name: string
          current_role: string
          location: string
          technical_skills: any[]
          rank: number
        }[]
      }
      search_candidates_by_skills: {
        Args: {
          skills: string[]
        }
        Returns: {
          id: string
          name: string
          current_role: string
          location: string
          technical_skills: any[]
          skill_matches: number
        }[]
      }
      get_candidate_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_candidates: number
          new_candidates: number
          reviewed_candidates: number
          shortlisted_candidates: number
          selected_candidates: number
          rejected_candidates: number
        }[]
      }
      verify_hr_credentials: {
        Args: {
          email_input: string
          password_input: string
        }
        Returns: {
          id: string
          email: string
          name: string
        }[]
      }
      get_hr_analytics: {
        Args: {
          target_hr_id: string
        }
        Returns: any
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
