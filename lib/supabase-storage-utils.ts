import { supabaseAdmin } from './supabase'

export const RESUME_BUCKET_NAME = 'resume-files'
export const CLIENT_LOGOS_BUCKET_NAME = 'client-logos'

export const BUCKET_NAME = RESUME_BUCKET_NAME

function extractStoragePath(input: string, bucketName: string) {
  const idx = input.indexOf(`${bucketName}/`)
  if (idx >= 0) return input.slice(idx + bucketName.length + 1)
  return input.replace(/^\/+/, '')
}

/**
 * Check if a file exists in Supabase Storage by name or path
 * @param fileName The file name or path to check
 * @returns Object with exists flag and optional url and path
 */
export async function checkFileExistsInSupabase(fileName: string): Promise<{ exists: boolean; url?: string; path?: string }> {
  try {
    // List all files in the bucket using admin client to bypass RLS
    const { data: files, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list()
    
    if (error) {
      console.error('Error listing files in storage:', error)
      return { exists: false }
    }
    
    // Check if a file with the same name exists
    const existingFile = files.find(file => {
      // Check exact match
      if (file.name === fileName) return true
      
      // Check if fileName is a path and matches the end of the path
      const fileNameParts = fileName.split('/')
      const simpleFileName = fileNameParts[fileNameParts.length - 1]
      return file.name === simpleFileName
    })
    
    if (existingFile) {
      console.log(`✅ File already exists in Supabase storage: ${existingFile.name}`)
      
      // Get the public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(existingFile.name)
      
      return { 
        exists: true, 
        url: publicUrl, 
        path: existingFile.name 
      }
    }
    
    return { exists: false }
  } catch (error) {
    // If we can't check, assume it doesn't exist and proceed with upload
    return { exists: false }
  }
}

/**
 * Upload a file to Supabase Storage
 * @param file The file or blob to upload
 * @param fileName The filename to use in storage
 * @returns Object with url and path of the uploaded file
 */
export async function uploadFileToSupabase(
  file: File | Blob,
  fileName: string,
  options?: { bucketName?: string }
): Promise<{ url: string; path: string }> {
  try {
    const bucketName = options?.bucketName || BUCKET_NAME
    const contentType = (file as any)?.type || undefined
    // Upload the file using admin client to bypass RLS policies
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        ...(contentType ? { contentType } : {}),
      })
    
    if (error) {
      console.error('❌ Failed to upload to Supabase Storage:', error)
      throw error
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(data.path)
    
    return { url: publicUrl, path: data.path }
  } catch (error) {
    throw error
  }
}

/**
 * Delete a file from Supabase Storage
 * @param url The URL or path of the file to delete
 * @returns Boolean indicating success
 */
export async function deleteFileFromSupabase(urlOrPath: string, options?: { bucketName?: string }): Promise<boolean> {
  try {
    const bucketName = options?.bucketName || BUCKET_NAME
    const path = extractStoragePath(urlOrPath, bucketName)
    
    // Delete the file using admin client to bypass RLS
    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([path])
    
    if (error) {
      console.error('❌ Failed to delete from Supabase Storage:', error)
      throw error
    }
    
    return true
  } catch (error) {
    return false
  }
}
