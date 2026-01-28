import { type NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { parseResume } from "@/lib/resume-parser"
import { generateEmbedding } from "@/lib/ai-utils"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"
import { ensureResumeBucketExists } from "@/lib/supabase"
import { checkFileExistsInSupabase } from "@/lib/supabase-storage-utils"

export async function POST(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("=== Comprehensive Resume Upload Started ===")

  // Get HR user ID if available
  let uploadedBy: string | undefined = undefined
  const hrUserCookie = request.cookies.get("hr_user")?.value
  if (hrUserCookie) {
    try {
      const hrUser = JSON.parse(hrUserCookie)
      if (hrUser && hrUser.id) {
        uploadedBy = hrUser.id
        console.log(`Associating upload with HR user: ${uploadedBy}`)
      }
    } catch (e) {
      console.warn("Failed to parse hr_user cookie:", e)
    }
  }

  try {
    const formData = await request.formData()
    const file = formData.get("resume") as File

    if (!file) {
      console.error("No file provided in request")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ]

    if (!allowedTypes.includes(file.type)) {
      // Check if it's a DOCX/DOC file with wrong MIME type
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        console.log(`⚠️ File has wrong MIME type: ${file.type}, but extension suggests Word document. Proceeding anyway...`)
      } else {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Only PDF, DOCX, DOC, and TXT files are allowed.` },
          { status: 400 },
        )
      }
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size too large. Maximum 10MB allowed." }, { status: 400 })
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`)
    console.log(`File extension: ${file.name.split('.').pop()?.toLowerCase()}`)
    console.log(`MIME type validation: ${allowedTypes.includes(file.type) ? 'PASSED' : 'FAILED'}`)

    // Ensure the Supabase bucket exists
    await ensureResumeBucketExists()
    
    // FIRST: Check if file already exists in Supabase storage
    console.log("Checking if file already exists in Supabase storage...")
    const fileExistsCheck = await checkFileExistsInSupabase(file.name)
    
    let fileUrl: string
    let filePath: string
    
    if (fileExistsCheck.exists && fileExistsCheck.url && fileExistsCheck.path) {
      console.log(`✅ File already exists in Supabase storage: ${file.name}`)
      fileUrl = fileExistsCheck.url
      filePath = fileExistsCheck.path
      
      // Check if this file is already associated with a candidate in the database
      console.log("Checking if file is already associated with a candidate...")
      const existingCandidates = await SupabaseCandidateService.getAllCandidates()
      const existingCandidate = existingCandidates.find(c => 
        c.fileUrl === fileUrl || c.fileName === file.name
      )
      
      if (existingCandidate) {
        console.log("File is already associated with existing candidate:", existingCandidate.name)
        return NextResponse.json({
          success: true,
          isDuplicate: true,
          message: "Resume already exists and is linked to an existing candidate",
          updatedExisting: false,
          resultType: "duplicate",
          duplicateInfo: {
            existingName: existingCandidate.name,
            existingId: existingCandidate.id,
            uploadedAt: existingCandidate.uploadedAt,
            reason: `File ${file.name} is already uploaded and associated with candidate ${existingCandidate.name}`,
            fileUrl: fileUrl
          }
        })
      }
      
      // File exists in Supabase storage but not associated with any candidate - we can reuse it
      console.log("File exists in Supabase storage but not associated with any candidate - reusing existing file")
    } else {
      // File doesn't exist in Supabase storage - need to parse and upload
      console.log("File not found in Supabase storage - proceeding with parsing and upload...")
      
      // Parse the resume to get candidate information
      console.log("Starting resume parsing...")
      let parsedData
      let parsingError: string | null = null
      
      try {
        parsedData = await parseResume(file)
        console.log("✅ Resume parsing successful")
        console.log("Parsed data:", JSON.stringify(parsedData, null, 2))
      } catch (parseError) {
        console.error("❌ Resume parsing failed:", parseError)
        parsingError = parseError instanceof Error ? parseError.message : "Unknown parsing error"
        
        // Return detailed parsing error information
        return NextResponse.json({
          error: "Resume parsing failed",
          parsingFailed: true,
          details: parsingError,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          suggestions: [
            "Check if the file is corrupted or password protected",
            "Ensure the file contains readable text content",
            "Try converting the file to a different format (PDF/DOCX)",
            "If the PDF is scanned/image-based, ensure Gemini OCR is enabled (GEMINI_API_KEY)"
          ],
          timestamp: new Date().toISOString()
        }, { status: 422 })
      }

      // Enforce resume content presence and quality
      const resumeText = (parsedData.resumeText || "").trim()
      const resumeTextLooksErroneous = /error|processing error|extraction failed/i.test(resumeText)
      if (!resumeText || resumeText.length < 50 || resumeTextLooksErroneous) {
        return NextResponse.json({
          error: "Resume content not extracted",
          parsingFailed: true,
          details: resumeTextLooksErroneous ? "Text extraction returned an error marker" : "Insufficient resume text available",
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          suggestions: [
            "If the PDF is scanned/image-based, ensure Gemini OCR is enabled (GEMINI_API_KEY)",
            "If DOC/DOCX, re-save as PDF and try again",
            "Ensure the file is not password protected",
            "Avoid uploading screenshots or photos of resumes"
          ],
          timestamp: new Date().toISOString(),
          resultType: "blocked"
        }, { status: 422 })
      }

      // Validation: block storing incomplete profiles
      const normalizedName = (parsedData.name || "").trim().toLowerCase()
      const isNameInvalid = !normalizedName || normalizedName.length < 2 || normalizedName === "unknown" || normalizedName === "not specified"
      const hasContact = !!(parsedData.email && parsedData.email.trim()) || !!(parsedData.phone && parsedData.phone.trim())
      const hasContent = !!(parsedData.resumeText && parsedData.resumeText.trim().length > 100)
      const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      const shouldBlock = isNameInvalid || (!hasContact && !hasContent)
      if (shouldBlock) {
        return NextResponse.json({
          error: "Invalid or incomplete profile",
          validationFailed: true,
          reasons: {
            nameInvalid: isNameInvalid,
            missingContactOrContent: !hasContact && !hasContent,
            fileType: file.type
          },
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          suggestions: [
            "Ensure the resume contains a valid candidate name",
            "Include an email or phone number in the resume",
            "Upload a PDF for best parsing accuracy",
            isDocx ? "Consider converting DOCX to PDF for improved parsing" : "If the PDF is scanned/image-based, enable Gemini OCR (GEMINI_API_KEY)"
          ],
          timestamp: new Date().toISOString(),
          resultType: "blocked",
        }, { status: 422 })
      }

      // Check for duplicate resumes before processing
      console.log("Checking for duplicate resumes...")
      const existingCandidates = await SupabaseCandidateService.getAllCandidates()
      
      // Check for duplicates based on multiple criteria
      // Only check email if it exists and is not empty
      const emailToCheck = parsedData.email?.trim()
      const duplicateChecks = [
        // Check by exact email match (only if email exists)
        emailToCheck ? existingCandidates.find(c => {
          const existingEmail = c.email?.trim()
          return existingEmail && existingEmail.toLowerCase() === emailToCheck.toLowerCase()
        }) : null,
        // Check by name + phone combination
        parsedData.phone?.trim() ? existingCandidates.find(c => 
          c.name?.toLowerCase() === parsedData.name?.toLowerCase() && 
          c.phone?.trim() === parsedData.phone?.trim()
        ) : null,
        // Check by name + location combination
        parsedData.location?.trim() ? existingCandidates.find(c => 
          c.name?.toLowerCase() === parsedData.name?.toLowerCase() && 
          c.location?.trim() && c.location.toLowerCase() === parsedData.location?.toLowerCase()
        ) : null,
        // Check by exact phone match (if phone exists)
        parsedData.phone?.trim() ? existingCandidates.find(c => c.phone?.trim() === parsedData.phone?.trim()) : null
      ].filter(Boolean) as any[]

      if (duplicateChecks.length > 0) {
        const duplicate = duplicateChecks[0]
        console.log("Duplicate resume detected:", duplicate)
        
        const candidateId = duplicate.id
        console.log("Uploading to Supabase Storage and updating existing candidate...")
        fileUrl = await SupabaseCandidateService.uploadFile(file, candidateId)
        filePath = fileUrl.split('/').pop() || ''

        await SupabaseCandidateService.updateCandidate(candidateId, {
          // Basic Information
          name: parsedData.name,
          email: parsedData.email || "",
          phone: parsedData.phone || "",
          dateOfBirth: parsedData.dateOfBirth || "",
          gender: parsedData.gender || "",
          maritalStatus: parsedData.maritalStatus || "",
          currentRole: parsedData.currentRole || "Not specified",
          desiredRole: parsedData.desiredRole || "",
          currentCompany: parsedData.currentCompany || "",
          location: parsedData.location || "Not specified",
          preferredLocation: parsedData.preferredLocation || "",
          totalExperience: parsedData.totalExperience || "Not specified",
          currentSalary: parsedData.currentSalary || "",
          expectedSalary: parsedData.expectedSalary || "",
          noticePeriod: parsedData.noticePeriod || "",
          highestQualification: parsedData.highestQualification || "",
          degree: parsedData.degree || "",
          specialization: parsedData.specialization || "",
          university: parsedData.university || "",
          educationYear: parsedData.educationYear || "",
          educationPercentage: parsedData.educationPercentage || "",
          additionalQualifications: parsedData.additionalQualifications || "",
          technicalSkills: parsedData.technicalSkills || [],
          softSkills: parsedData.softSkills || [],
          languagesKnown: parsedData.languagesKnown || [],
          certifications: parsedData.certifications || [],
          previousCompanies: parsedData.previousCompanies || [],
          jobTitles: parsedData.jobTitles || [],
          workDuration: parsedData.workDuration || [],
          keyAchievements: parsedData.keyAchievements || [],
          workExperience: parsedData.workExperience || [],
          education: parsedData.education || [],
          // Additional Information
          projects: parsedData.projects || [],
          awards: parsedData.awards || [],
          publications: parsedData.publications || [],
          references: parsedData.references || [],
          linkedinProfile: parsedData.linkedinProfile || "",
          portfolioUrl: parsedData.portfolioUrl || "",
          githubProfile: parsedData.githubProfile || "",
          summary: parsedData.summary || "",
          // File Information
          resumeText: parsedData.resumeText,
          fileName: file.name,
          fileUrl: fileUrl,
        })

        console.log("=== Existing candidate updated successfully ===")
        return NextResponse.json({
          success: true,
          candidateId,
          message: "Existing candidate updated with new resume",
          fileUrl: fileUrl,
          reusedExistingFile: false,
          updatedExisting: true,
          resultType: "updated",
          ...Object.fromEntries(Object.entries(parsedData).filter(([key]) => key !== 'fileUrl')),
        })
      }

      // Generate a unique ID for the candidate
      const candidateId = crypto.randomUUID()

      // Upload file to Supabase Storage
      console.log("Uploading to Supabase Storage...")
      fileUrl = await SupabaseCandidateService.uploadFile(file, candidateId)
      filePath = fileUrl.split('/').pop() || ''

      // Generate embedding for vector search (optional)
      console.log("Generating embedding...")
      let embedding: number[] = []
      try {
        embedding = await generateEmbedding(parsedData.resumeText || "")
        console.log("✅ Embedding generated successfully")
      } catch (embeddingError) {
        console.warn("⚠️ Failed to generate embedding:", embeddingError)
        // Continue without embedding
      }

      // Prepare candidate data for Supabase
      const candidateData = {
        // Basic Information
        name: parsedData.name,
        email: (parsedData.email && parsedData.email.trim()) ? parsedData.email.trim() : `${candidateId}@unknown.invalid`,
        phone: parsedData.phone || "",
        dateOfBirth: parsedData.dateOfBirth || "",
        gender: parsedData.gender || "",
        maritalStatus: parsedData.maritalStatus || "",
        currentRole: parsedData.currentRole || "Not specified",
        desiredRole: parsedData.desiredRole || "",
        currentCompany: parsedData.currentCompany || "",
        location: parsedData.location || "Not specified",
        preferredLocation: parsedData.preferredLocation || "",
        totalExperience: parsedData.totalExperience || "Not specified",
        currentSalary: parsedData.currentSalary || "",
        expectedSalary: parsedData.expectedSalary || "",
        noticePeriod: parsedData.noticePeriod || "",
        highestQualification: parsedData.highestQualification || "",
        degree: parsedData.degree || "",
        specialization: parsedData.specialization || "",
        university: parsedData.university || "",
        educationYear: parsedData.educationYear || "",
        educationPercentage: parsedData.educationPercentage || "",
        additionalQualifications: parsedData.additionalQualifications || "",
        technicalSkills: parsedData.technicalSkills || [],
        softSkills: parsedData.softSkills || [],
        languagesKnown: parsedData.languagesKnown || [],
        certifications: parsedData.certifications || [],
        previousCompanies: parsedData.previousCompanies || [],
        jobTitles: parsedData.jobTitles || [],
        workDuration: parsedData.workDuration || [],
        keyAchievements: parsedData.keyAchievements || [],
        workExperience: parsedData.workExperience || [],
        education: parsedData.education || [],

        // Additional Information
        projects: parsedData.projects || [],
        awards: parsedData.awards || [],
        publications: parsedData.publications || [],
        references: parsedData.references || [],
        linkedinProfile: parsedData.linkedinProfile || "",
        portfolioUrl: parsedData.portfolioUrl || "",
        githubProfile: parsedData.githubProfile || "",
        summary: parsedData.summary || "",

        // File Information
        resumeText: parsedData.resumeText,
        fileName: file.name,
        fileUrl: fileUrl, // URL to access file in Supabase storage
        filePath: filePath,

        // Vector embedding (optional)
        embedding,

        // System Fields
        status: "new" as const,
        tags: [],
        rating: undefined,
        notes: "",
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastContacted: "",
        interviewStatus: "not-scheduled" as const,
        feedback: "",
        
        // Parsing metadata
        parsing_method: "gemini",
        parsing_confidence: 0.95,
        parsing_errors: [],
        uploadedBy: uploadedBy,
      }

      // Add to Supabase
      console.log("Adding to Supabase...")
      // We already generated candidateId earlier for the file upload
      try {
        await SupabaseCandidateService.addCandidate(candidateData)
      } catch (addError: any) {
        if (addError?.code === '23505' && addError?.message?.includes('email')) {
          console.log("Duplicate email detected during insert, updating existing candidate")
          
          let existingCandidate = null as any
          if (parsedData.email && parsedData.email.trim()) {
            existingCandidate = await SupabaseCandidateService.getCandidateByEmail(parsedData.email.trim())
          }
          
          if (!existingCandidate) {
            console.warn("Duplicate email error but could not find candidate by email:", parsedData.email)
            throw addError
          }
          
          if (existingCandidate?.id) {
            await SupabaseCandidateService.updateCandidate(existingCandidate.id, {
              ...candidateData
            })
            return NextResponse.json({
              success: true,
              candidateId: existingCandidate.id,
              message: "Existing candidate updated with parsed data",
              fileUrl: fileUrl,
              reusedExistingFile: false,
              ...Object.fromEntries(Object.entries(parsedData).filter(([key]) => key !== 'fileUrl')),
            })
          }
        }
        throw addError
      }

      console.log("=== Resume Upload Completed Successfully ===")

      return NextResponse.json({
        success: true,
        candidateId,
        message: "Resume processed successfully",
        fileUrl: fileUrl,
        reusedExistingFile: false,
        updatedExisting: false,
        resultType: "created",
        ...Object.fromEntries(Object.entries(parsedData).filter(([key]) => key !== 'fileUrl')),
      })
    }

    // If we reach here, we're reusing an existing file that's not associated with any candidate
    // We need to parse it to create a new candidate entry
    console.log("Reusing existing file - parsing to create new candidate entry...")
    
    try {
      // Download the existing file from Supabase storage to parse it
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to download existing file from Supabase storage: ${response.status}`)
      }
      
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      
      // Create a mock File object for parsing
      const mockFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        arrayBuffer: () => Promise.resolve(arrayBuffer),
        text: () => blob.text(),
        slice: (start?: number, end?: number) => {
          const slicedBuffer = arrayBuffer.slice(start || 0, end || arrayBuffer.byteLength)
          return {
            arrayBuffer: () => Promise.resolve(slicedBuffer),
            text: () => new TextDecoder().decode(slicedBuffer)
          }
        }
      }
      
      // Parse the resume using the mock file object
      console.log("Parsing existing file from Supabase storage...")
      const parsedData = await parseResume(mockFile as any)
      console.log("✅ Resume parsing successful from existing file")
      
      // Check for duplicate resumes before processing
      console.log("Checking for duplicate resumes...")
      const existingCandidates = await SupabaseCandidateService.getAllCandidates()
      
      const duplicateChecks = [
        // Check by exact email match (only if email exists)
        parsedData.email?.trim() ? existingCandidates.find(c => {
          const existingEmail = c.email?.trim()
          return existingEmail && existingEmail.toLowerCase() === parsedData.email!.trim().toLowerCase()
        }) : null,
        // Check by name + phone combination
        parsedData.phone?.trim() ? existingCandidates.find(c => 
          c.name?.toLowerCase() === parsedData.name?.toLowerCase() && 
          c.phone?.trim() === parsedData.phone?.trim()
        ) : null,
        // Check by name + location combination
        parsedData.location?.trim() ? existingCandidates.find(c => 
          c.name?.toLowerCase() === parsedData.name?.toLowerCase() && 
          c.location?.trim() && c.location.toLowerCase() === parsedData.location?.toLowerCase()
        ) : null,
        // Check by exact phone match (if phone exists)
        parsedData.phone?.trim() ? existingCandidates.find(c => c.phone?.trim() === parsedData.phone?.trim()) : null
      ].filter(Boolean) as any[]

      if (duplicateChecks.length > 0) {
        const duplicate = duplicateChecks[0]
        console.log("Duplicate resume detected:", duplicate)
        
        await SupabaseCandidateService.updateCandidate(duplicate.id, {
          name: parsedData.name,
          email: parsedData.email || "",
          phone: parsedData.phone || "",
          dateOfBirth: parsedData.dateOfBirth || "",
          gender: parsedData.gender || "",
          maritalStatus: parsedData.maritalStatus || "",
          currentRole: parsedData.currentRole || "Not specified",
          desiredRole: parsedData.desiredRole || "",
          currentCompany: parsedData.currentCompany || "",
          location: parsedData.location || "Not specified",
          preferredLocation: parsedData.preferredLocation || "",
          totalExperience: parsedData.totalExperience || "Not specified",
          currentSalary: parsedData.currentSalary || "",
          expectedSalary: parsedData.expectedSalary || "",
          noticePeriod: parsedData.noticePeriod || "",
          highestQualification: parsedData.highestQualification || "",
          degree: parsedData.degree || "",
          specialization: parsedData.specialization || "",
          university: parsedData.university || "",
          educationYear: parsedData.educationYear || "",
          educationPercentage: parsedData.educationPercentage || "",
          additionalQualifications: parsedData.additionalQualifications || "",
          technicalSkills: parsedData.technicalSkills || [],
          softSkills: parsedData.softSkills || [],
          languagesKnown: parsedData.languagesKnown || [],
          certifications: parsedData.certifications || [],
          previousCompanies: parsedData.previousCompanies || [],
          jobTitles: parsedData.jobTitles || [],
          workDuration: parsedData.workDuration || [],
          keyAchievements: parsedData.keyAchievements || [],
          workExperience: parsedData.workExperience || [],
          education: parsedData.education || [],
          projects: parsedData.projects || [],
          awards: parsedData.awards || [],
          publications: parsedData.publications || [],
          references: parsedData.references || [],
          linkedinProfile: parsedData.linkedinProfile || "",
          portfolioUrl: parsedData.portfolioUrl || "",
          githubProfile: parsedData.githubProfile || "",
          summary: parsedData.summary || "",
          fileName: file.name,
          fileUrl: fileUrl,
        })

        console.log("=== Existing candidate updated successfully (Reused File) ===")
        return NextResponse.json({
          success: true,
          candidateId: duplicate.id,
          message: "Existing candidate updated with reused file",
          fileUrl: fileUrl,
          reusedExistingFile: true,
          updatedExisting: true,
          resultType: "updated",
          ...Object.fromEntries(Object.entries(parsedData).filter(([key]) => key !== 'fileUrl')),
        })
      }

      // Generate embedding for vector search (optional)
      console.log("Generating embedding...")
      let embedding: number[] = []
      try {
        embedding = await generateEmbedding(parsedData.resumeText || "")
        console.log("✅ Embedding generated successfully")
      } catch (embeddingError) {
        console.warn("⚠️ Failed to generate embedding:", embeddingError)
        // Continue without embedding
      }

      // Generate a unique ID for the candidate
      const candidateId = crypto.randomUUID()

      // Prepare candidate data for Supabase
      const candidateData = {
        // Basic Information
        name: parsedData.name,
        email: parsedData.email || "",
        phone: parsedData.phone || "",
        dateOfBirth: parsedData.dateOfBirth || "",
        gender: parsedData.gender || "",
        maritalStatus: parsedData.maritalStatus || "",
        currentRole: parsedData.currentRole || "Not specified",
        desiredRole: parsedData.desiredRole || "",
        currentCompany: parsedData.currentCompany || "",
        location: parsedData.location || "Not specified",
        preferredLocation: parsedData.preferredLocation || "",
        totalExperience: parsedData.totalExperience || "Not specified",
        currentSalary: parsedData.currentSalary || "",
        expectedSalary: parsedData.expectedSalary || "",
        noticePeriod: parsedData.noticePeriod || "",
        highestQualification: parsedData.highestQualification || "",
        degree: parsedData.degree || "",
        specialization: parsedData.specialization || "",
        university: parsedData.university || "",
        educationYear: parsedData.educationYear || "",
        educationPercentage: parsedData.educationPercentage || "",
        additionalQualifications: parsedData.additionalQualifications || "",
        technicalSkills: parsedData.technicalSkills || [],
        softSkills: parsedData.softSkills || [],
        languagesKnown: parsedData.languagesKnown || [],
        certifications: parsedData.certifications || [],
        previousCompanies: parsedData.previousCompanies || [],
        jobTitles: parsedData.jobTitles || [],
        workDuration: parsedData.workDuration || [],
        keyAchievements: parsedData.keyAchievements || [],
        workExperience: parsedData.workExperience || [],
        education: parsedData.education || [],

        // Additional Information
        projects: parsedData.projects || [],
        awards: parsedData.awards || [],
        publications: parsedData.publications || [],
        references: parsedData.references || [],
        linkedinProfile: parsedData.linkedinProfile || "",
        portfolioUrl: parsedData.portfolioUrl || "",
        githubProfile: parsedData.githubProfile || "",
        summary: parsedData.summary || "",

        // File Information
        resumeText: parsedData.resumeText,
        fileName: file.name,
        filePath: filePath,
        fileUrl: fileUrl,

        // System Fields
        status: "new" as const,
        tags: [],
        rating: undefined,
        notes: "",
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastContacted: "",
        interviewStatus: "not-scheduled" as const,
        feedback: "",
        
        // Parsing metadata
        parsing_method: "gemini",
        parsing_confidence: 0.95,
        parsing_errors: [],
        uploadedBy: uploadedBy,
      }

      // Add to Supabase
      console.log("Adding to Supabase...")
      try {
        await SupabaseCandidateService.addCandidate(candidateData)
      } catch (addError: any) {
        // Handle duplicate email constraint violation
        if (addError?.code === '23505' && addError?.message?.includes('email')) {
          console.log("Duplicate email detected during insert")
          
          // Try to find the existing candidate
          const existingCandidates = await SupabaseCandidateService.getAllCandidates()
          const existingCandidate = existingCandidates.find(c => 
            c.email?.trim().toLowerCase() === parsedData.email?.trim().toLowerCase()
          )
          
          if (existingCandidate) {
            return NextResponse.json({
              error: "Resume already exists",
              isDuplicate: true,
              duplicateInfo: {
                existingName: existingCandidate.name,
                existingId: existingCandidate.id,
                uploadedAt: existingCandidate.uploadedAt,
                reason: `Candidate with email ${parsedData.email} already exists in database`
              }
            }, { status: 409 })
          }
        }
        
        // Re-throw if it's not a duplicate email error
        throw addError
      }

      console.log("=== Resume Upload Completed Successfully (Reused Existing File) ===")

      return NextResponse.json({
        success: true,
        candidateId,
        message: "Resume processed successfully (reused existing file)",
        fileUrl: fileUrl,
        reusedExistingFile: true,
        updatedExisting: false,
        resultType: "created",
        ...Object.fromEntries(Object.entries(parsedData).filter(([key]) => key !== 'fileUrl')),
      })
      
    } catch (parseError) {
      console.error("❌ Failed to parse existing file from Supabase storage:", parseError)
      return NextResponse.json({
        error: "Failed to parse existing file from Supabase storage",
        details: parseError instanceof Error ? parseError.message : "Unknown error",
        fileName: file.name,
        fileUrl: fileUrl,
        suggestions: [
          "The file may be corrupted in Supabase storage",
          "Try uploading the file again to replace the existing one",
          "Check if the file format is supported"
        ],
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error("=== Resume Upload Error ===")
    console.error("Error details:", error)

    return NextResponse.json(
      {
        error: "Failed to process resume",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
