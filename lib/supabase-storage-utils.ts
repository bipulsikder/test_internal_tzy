import { supabase, supabaseAdmin } from './supabase'

/**
 * Check if a file exists in Supabase Storage by name or path
 * @param fileName The file name or path to check
 * @returns Object with exists flag and optional url and path
 */
export async function checkFileExistsInSupabase(fileName: string): Promise<{ exists: boolean; url?: string; path?: string }> {
  try {
    console.log(`Checking if file exists in Supabase storage: ${fileName}`)
    
    // List all files in the bucket using admin client to bypass RLS
    const { data: files, error } = await supabaseAdmin.storage
      .from('resume-files')
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
        .from('resume-files')
        .getPublicUrl(existingFile.name)
      
      return { 
        exists: true, 
        url: publicUrl, 
        path: existingFile.name 
      }
    }
    
    console.log(`❌ File not found in Supabase storage: ${fileName}`)
    return { exists: false }
  } catch (error) {
    console.error('❌ Error checking file existence in Supabase storage:', error)
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
export async function uploadFileToSupabase(file: File | Blob, fileName: string): Promise<{ url: string; path: string }> {
  try {
    console.log(`Uploading file to Supabase Storage: ${fileName}`)
    
    // Upload the file using admin client to bypass RLS policies
    const { data, error } = await supabaseAdmin.storage
      .from('resume-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('❌ Failed to upload to Supabase Storage:', error)
      throw error
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('resume-files')
      .getPublicUrl(data.path)
    
    console.log(`✅ File uploaded to Supabase Storage: ${publicUrl}`)
    return { url: publicUrl, path: data.path }
  } catch (error) {
    console.error('❌ Failed to upload to Supabase Storage:', error)
    throw error
  }
}

/**
 * Delete a file from Supabase Storage
 * @param url The URL or path of the file to delete
 * @returns Boolean indicating success
 */
export async function deleteFileFromSupabase(url: string): Promise<boolean> {
  try {
    console.log(`Deleting file from Supabase Storage: ${url}`)
    
    // Extract the path from the URL if it's a full URL
    let path = url
    if (url.includes('resume-files/')) {
      path = url.split('resume-files/')[1]
    }
    
    // Delete the file using admin client to bypass RLS
    const { error } = await supabaseAdmin.storage
      .from('resume-files')
      .remove([path])
    
    if (error) {
      console.error('❌ Failed to delete from Supabase Storage:', error)
      throw error
    }
    
    console.log(`✅ File deleted from Supabase Storage: ${path}`)
    return true
  } catch (error) {
    console.error('❌ Failed to delete from Supabase Storage:', error)
    return false
  }
}