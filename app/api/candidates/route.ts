import { type NextRequest, NextResponse } from "next/server"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const paginate = searchParams.get('paginate') === 'true'
    const page = Number(searchParams.get('page') ?? '1')
    const perPage = Number(searchParams.get('perPage') ?? '50')
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? 'all'
    const sortBy = searchParams.get('sortBy') ?? 'uploaded_at'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc'

    logger.info(`GET /api/candidates paginate=${paginate} page=${page} perPage=${perPage} search="${search}" status="${status}"`)
    logger.info(`Fetching candidates from Supabase${paginate ? ' (paginated)' : ''}`)

    if (paginate) {
      const { items, total } = await SupabaseCandidateService.getCandidatesPaginated({
        page,
        perPage,
        sortBy,
        sortOrder,
        search,
        status,
      })
      logger.info(`Supabase returned: page=${page} perPage=${perPage} total=${total} rows=${items.length}`)

      const transformedCandidates = items.map((candidate) => ({
        _id: candidate.id,
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        currentRole: candidate.currentRole,
        desiredRole: candidate.desiredRole,
        currentCompany: candidate.currentCompany,
        location: candidate.location,
        preferredLocation: candidate.preferredLocation,
        totalExperience: candidate.totalExperience,
        currentSalary: candidate.currentSalary,
        expectedSalary: candidate.expectedSalary,
        noticePeriod: candidate.noticePeriod,
        highestQualification: candidate.highestQualification,
        degree: candidate.degree,
        specialization: candidate.specialization,
        university: candidate.university,
        educationYear: candidate.educationYear,
        educationPercentage: candidate.educationPercentage,
        technicalSkills: candidate.technicalSkills,
        softSkills: candidate.softSkills,
        languagesKnown: candidate.languagesKnown,
        certifications: candidate.certifications,
        previousCompanies: candidate.previousCompanies,
        jobTitles: candidate.jobTitles,
        workDuration: candidate.workDuration,
        keyAchievements: candidate.keyAchievements,
        workExperience: candidate.workExperience || [],
        education: candidate.education || [],
        projects: candidate.projects,
        awards: candidate.awards,
        publications: candidate.publications,
        references: candidate.references,
        resumeText: candidate.resumeText,
        fileName: candidate.fileName,
        fileUrl: candidate.fileUrl,
        tags: candidate.tags,
        status: candidate.status,
        rating: candidate.rating,
        notes: candidate.notes,
        uploadedAt: candidate.uploadedAt,
        updatedAt: candidate.updatedAt,
        lastContacted: candidate.lastContacted,
        interviewStatus: candidate.interviewStatus,
        feedback: candidate.feedback,
        linkedinProfile: candidate.linkedinProfile,
        portfolioUrl: candidate.portfolioUrl,
        githubProfile: candidate.githubProfile,
        summary: candidate.summary,
      }))

      logger.info(`Paginated: page=${page} perPage=${perPage} total=${total} returned=${transformedCandidates.length}`)
      logger.info(`Returning paginated: page=${page} perPage=${perPage} total=${total} items=${transformedCandidates.length}`)

      return NextResponse.json({ items: transformedCandidates, page, perPage, total })
    }

    const candidates = await SupabaseCandidateService.getAllCandidates()
    logger.info(`Retrieved ${candidates.length} candidates`)

    const transformedCandidates = candidates.map((candidate) => ({
      _id: candidate.id, // Map id to _id for frontend compatibility
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      currentRole: candidate.currentRole,
      desiredRole: candidate.desiredRole,
      currentCompany: candidate.currentCompany,
      location: candidate.location,
      preferredLocation: candidate.preferredLocation,
      totalExperience: candidate.totalExperience,
      currentSalary: candidate.currentSalary,
      expectedSalary: candidate.expectedSalary,
      noticePeriod: candidate.noticePeriod,
      highestQualification: candidate.highestQualification,
      degree: candidate.degree,
      specialization: candidate.specialization,
      university: candidate.university,
      educationYear: candidate.educationYear,
      educationPercentage: candidate.educationPercentage,
      technicalSkills: candidate.technicalSkills,
      softSkills: candidate.softSkills,
      languagesKnown: candidate.languagesKnown,
      certifications: candidate.certifications,
      previousCompanies: candidate.previousCompanies,
      jobTitles: candidate.jobTitles,
      workDuration: candidate.workDuration,
      keyAchievements: candidate.keyAchievements,
      workExperience: candidate.workExperience || [],
      education: candidate.education || [],
      projects: candidate.projects,
      awards: candidate.awards,
      publications: candidate.publications,
      references: candidate.references,
      resumeText: candidate.resumeText,
      fileName: candidate.fileName,
      fileUrl: candidate.fileUrl, // Use fileUrl from Supabase instead of driveFileUrl
      tags: candidate.tags,
      status: candidate.status,
      rating: candidate.rating,
      notes: candidate.notes,
      uploadedAt: candidate.uploadedAt,
      updatedAt: candidate.updatedAt,
      lastContacted: candidate.lastContacted,
      interviewStatus: candidate.interviewStatus,
      feedback: candidate.feedback,
      linkedinProfile: candidate.linkedinProfile,
      portfolioUrl: candidate.portfolioUrl,
      githubProfile: candidate.githubProfile,
      summary: candidate.summary,
    }))

    logger.info(`Retrieved ${transformedCandidates.length} candidates from Supabase`)
    return NextResponse.json(transformedCandidates)
  } catch (error) {
    console.error("❌ Failed to fetch candidates from Supabase:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch candidates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
