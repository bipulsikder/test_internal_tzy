import { type NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { generateEmbedding, searchCandidates, extractKeywordsFromSentence, extractSearchKeywordsWithAI } from "@/lib/ai-utils"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"
import { logger } from "@/lib/logger"
import { parseSearchRequirement, intelligentCandidateSearch } from "@/lib/intelligent-search"
import { generateCandidateSummary } from "@/lib/ai-summary"

// JD-based search function for job description analysis
async function jdBasedSearch(jobDescription: string, candidates: any[]): Promise<any[]> {
  console.log("=== JD-Based Search (Skill-Only, Logistics Domain) ===")

  try {
    const jdText = (jobDescription || '').toLowerCase();
    
    // Use ONLY the provided logistics skill list for JD search
    const LOGISTICS_SKILLS = [
      'gps tracking',
      'fleet management',
      'route optimization',
      'supply chain management',
      'inventory management',
      'logistics planning',
      'vehicle tracking',
      'warehouse management',
      'transportation management',
      'driver management',
      'fuel management',
      'maintenance scheduling',
      'compliance',
      'safety regulations',
      'dot regulations',
      'international fuel tax agreement',
      'communication',
      'problem solving',
      'leadership',
      'team management',
      'data analysis',
    ];
    
    // Match skills appearing in the JD text (strict intersection)
    const matchedSkills = LOGISTICS_SKILLS.filter(skill => jdText.includes(skill.toLowerCase()));
    console.log('JD matched skills:', matchedSkills);
    
    const skillsForSearch = matchedSkills.length > 0 ? matchedSkills : LOGISTICS_SKILLS;
    console.log('Using Supabase skill-based search with skills:', skillsForSearch);
    
    // Primary: Supabase skill-based search
    try {
      const supabaseResults = await SupabaseCandidateService.searchCandidatesBySkills(skillsForSearch);
      
      if (supabaseResults && supabaseResults.length > 0) {
        // Score candidates by matched skill count and distribution across fields
        const scored = supabaseResults.map(candidate => {
          const text = [
            (candidate.currentRole || ''),
            (candidate.summary || ''),
            (candidate.resumeText || ''),
            (candidate.currentCompany || ''),
            ...(candidate.technicalSkills || []),
            ...(candidate.softSkills || []),
          ].join(' ').toLowerCase();
          
          const candidateSkills = new Set((candidate.technicalSkills || []).map((s: string) => s.toLowerCase()));
          let hits = 0;
          skillsForSearch.forEach(skill => {
            const s = skill.toLowerCase();
            if (candidateSkills.has(s) || text.includes(s)) hits += 1;
          });
          
          // Relevance based on ratio of matched skills and slight text boost
          const base = hits / skillsForSearch.length; // 0..1
          const boost = Math.min(0.15, hits * 0.02);
          const relevanceScore = Math.max(0, Math.min(1, base + boost));
          const matchPercentage = Math.round(base * 100);
          
          return {
            ...candidate,
            relevanceScore,
            matchPercentage,
            matchingKeywords: matchedSkills.length > 0 ? matchedSkills : skillsForSearch,
          };
        });
        
        // Sort by relevance and return
        return scored.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      }
    } catch (error) {
      console.error('Supabase skill search failed, falling back to local/AI search:', error);
    }
    
    // Fallback: local weighted search using skill phrases as query
    const fallbackQuery = skillsForSearch.join(' ');
    const aiResults = await searchCandidates(fallbackQuery, candidates);
    return aiResults.map(c => ({
      ...c,
      matchingKeywords: matchedSkills.length > 0 ? matchedSkills : skillsForSearch,
    }));
  } catch (error) {
    console.error('JD analysis failed:', error);
    // Final fallback: return empty array rather than noisy matches
    return [];
  }
}

// Helper function to process pagination and add AI summaries
async function processResultsWithSummary(
  results: any[],
  page: number,
  perPage: number,
  paginate: boolean,
  requirements: any,
  includeSummary: boolean
) {
    let items = results;
    let total = results.length;
    let currentPage = page;

    if (paginate) {
        const totalPages = Math.max(1, Math.ceil(total / perPage))
        currentPage = Math.min(page, totalPages)
        const startIdx = (currentPage - 1) * perPage
        items = results.slice(startIdx, startIdx + perPage)
    }

    if (includeSummary && items.length > 0) {
      const summaryPromises = items.map(async (candidate) => {
        const summary = await generateCandidateSummary(candidate, requirements)
        return {
          ...candidate,
          matchSummary: summary
        }
      })
      items = await Promise.all(summaryPromises)
    }

    if (paginate) {
        return { items, total, page: currentPage, perPage };
    }
    return items;
}

// Simple in-memory cache to reduce repeated full-sheet reads during rapid searches
let candidatesCache: any[] | null = null
let candidatesCacheAt = 0
const CANDIDATES_CACHE_MS = 5_000 

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
    const searchType   = searchParams.get('type') ?? 'smart'
    const query        = searchParams.get('keywords') ?? searchParams.get('query') ?? ''
    const jobDescription = searchParams.get('jobDescription') ?? searchParams.get('jd') ?? ''
    const paginate     = searchParams.get('paginate') === 'true'
    const page         = Number(searchParams.get('page') ?? '1')
    const perPage      = Number(searchParams.get('perPage') ?? '25')
    const includeSummary = searchParams.get('includeSummary') === 'true' || searchParams.get('includeSummary') === '1'

    // Build filters object from individual keys
    const filters: any = {}
    if (searchParams.get('location')) filters.location = searchParams.get('location')
    if (searchParams.get('education')) filters.education = searchParams.get('education')
    if (searchParams.get('minExperience')) filters.minExperience = Number(searchParams.get('minExperience'))
    if (searchParams.get('maxExperience')) filters.maxExperience = Number(searchParams.get('maxExperience'))

    console.log("=== Enhanced Search API ===")
    console.log("Search Type:", searchType)
    console.log("Query:", query)
    logger.info(`Search request: type=${searchType} query="${query}" jd=${!!jobDescription} filters=${JSON.stringify(filters)}`)

    // Determine initial candidate pool
    let allCandidates: any[] = []
    
    // Build search text from query or JD - prioritize getting good candidate pool
    const searchText = (searchType === 'jd' && jobDescription) 
      ? jobDescription.trim() 
      : (query && query.trim().length > 0 ? query.trim() : '')
    
    // If we have search text (query or JD), prioritize DB Full Text Search
    if (searchText && searchText.length > 0) {
      try {
        console.log(`Using DB Full Text Search for: "${searchText.substring(0, 100)}..."`);
        // 1. Try strict search first - for JD, use first part; for query use full
        const searchQuery = searchType === 'jd' ? searchText.substring(0, 500) : searchText;
        allCandidates = await SupabaseCandidateService.searchCandidatesByText(searchQuery, 500);
        console.log(`Strict DB Search returned ${allCandidates.length} candidates`);

        // 2. If strict search yields few results, try AI-enhanced keyword search
        if (allCandidates.length < 50) {
           console.log("Strict search yielded few results, using AI to extract optimal keywords...");
           try {
             const aiKeywords = await extractSearchKeywordsWithAI(searchText);
             const formattedQuery = aiKeywords.map(k => k.includes(' ') ? `"${k}"` : k).join(' ');
             
             if (formattedQuery.length > 0 && formattedQuery !== searchQuery) {
               console.log(`AI Refined Search Query: ${formattedQuery}`);
               const aiResults = await SupabaseCandidateService.searchCandidatesByText(formattedQuery, 500);
               
               const existingIds = new Set(allCandidates.map(c => c.id));
               aiResults.forEach(c => {
                 if (c.id && !existingIds.has(c.id)) {
                   allCandidates.push(c);
                   existingIds.add(c.id);
                 }
               });
             }
           } catch (aiError) {
             console.error("AI search refinement failed:", aiError);
           }
         }
      } catch (error) {
        console.error("DB Text Search failed, falling back to cache:", error);
      }

      // 3. Vector Search (Semantic Search) - Currently disabled as method doesn't exist
      // TODO: Re-enable when searchCandidatesByEmbedding is implemented in SupabaseCandidateService
      // try {
      //   console.log(`Generating embedding for vector search: "${query}"`);
      //   const embedding = await generateEmbedding(query);
      //   
      //   if (embedding && embedding.length > 0) {
      //     console.log("Executing vector search...");
      //     const vectorResults = await SupabaseCandidateService.searchCandidatesByEmbedding(embedding, 0.6, 50); 
      //     
      //     const existingIds = new Set(allCandidates.map(c => c.id));
      //     vectorResults.forEach(c => {
      //       if (c.id && !existingIds.has(c.id)) {
      //         (c as any).source = 'vector';
      //         allCandidates.push(c);
      //         existingIds.add(c.id);
      //       }
      //     });
      //   }
      // } catch (vectorError) {
      //   console.error("Vector search failed:", vectorError);
      // }
    }

    // If we have a Job Description, use it for vector search as well - Currently disabled as method doesn't exist
    // TODO: Re-enable when searchCandidatesByEmbedding is implemented in SupabaseCandidateService
    // if (jobDescription && jobDescription.trim().length > 0) {
    //   try {
    //     console.log(`Generating embedding for JD search...`);
    //     const embedding = await generateEmbedding(jobDescription.slice(0, 8000));
    //     
    //     if (embedding && embedding.length > 0) {
    //       console.log("Executing vector search for JD...");
    //       const vectorResults = await SupabaseCandidateService.searchCandidatesByEmbedding(embedding, 0.5, 50); 
    //       
    //       const existingIds = new Set(allCandidates.map(c => c.id));
    //       vectorResults.forEach(c => {
    //         if (c.id && !existingIds.has(c.id)) {
    //           (c as any).source = 'vector-jd';
    //           allCandidates.push(c);
    //           existingIds.add(c.id);
    //         }
    //       });
    //     }
    //   } catch (vectorError) {
    //     console.error("JD vector search failed:", vectorError);
    //   }
    // }

    // Fallback to cache/fetch-all if DB search returned too few results
    if (allCandidates.length < 50) {
      console.log(`Candidate pool small (${allCandidates.length}), fetching full list for AI filtering...`);
      const now = Date.now()
      if (!candidatesCache || now - candidatesCacheAt > CANDIDATES_CACHE_MS) {
        try {
          const fresh = await SupabaseCandidateService.getAllCandidates()
          candidatesCache = fresh
          candidatesCacheAt = now
        } catch (error) {
          console.error("Error fetching candidates from Supabase:", error)
          candidatesCache = []
          candidatesCacheAt = now
        }
      }
      
      const cache = candidatesCache || []
      const existingIds = new Set(allCandidates.map(c => c.id));
      cache.forEach(c => {
        if (c.id && !existingIds.has(c.id)) {
          allCandidates.push(c);
          existingIds.add(c.id);
        }
      });
    }

    // Transform data to ensure consistency
    const transformedCandidates = allCandidates.map((candidate) => ({
      ...candidate,
      _id: candidate.id,
      technicalSkills: Array.isArray(candidate.technicalSkills) ? candidate.technicalSkills : [],
      softSkills: Array.isArray(candidate.softSkills) ? candidate.softSkills : [],
      tags: Array.isArray(candidate.tags) ? candidate.tags : [],
      certifications: Array.isArray(candidate.certifications) ? candidate.certifications : [],
      languagesKnown: Array.isArray(candidate.languagesKnown) ? candidate.languagesKnown : [],
      // Ensure fields for display
      currentRole: candidate.currentRole || candidate.current_role || "",
      totalExperience: candidate.totalExperience || candidate.total_experience || "",
      location: candidate.location || "",
      resumeText: candidate.resumeText || candidate.resume_text || "",
      fileUrl: candidate.fileUrl || candidate.file_url || "",
      fileName: candidate.fileName || candidate.file_name || "",
    }))

    let results: any[] = []
    let activeRequirements: any = {}

    switch (searchType) {
      case "smart":
        const smartSearchText = query.trim() || jobDescription.trim()
        console.log("🧠 Processing TruckinzyAI semantic search query:", smartSearchText)
        activeRequirements = await parseSearchRequirement(smartSearchText)
        results = await intelligentCandidateSearch(activeRequirements, transformedCandidates)
        break

      case "jd":
        if (!jobDescription || jobDescription.trim().length === 0) {
           return NextResponse.json({ error: "Job description is required" }, { status: 400 })
        }
        console.log("🧠 Processing Job Description with intelligent parsing:", jobDescription.substring(0, 100))
        activeRequirements = await parseSearchRequirement(jobDescription)
        // Merge any explicit filters from params
        if (filters.location) activeRequirements.location = filters.location
        if (filters.education) activeRequirements.education = filters.education
        if (filters.minExperience || filters.maxExperience) {
          activeRequirements.experience = {
            ...(activeRequirements.experience || {}),
            min: filters.minExperience || activeRequirements.experience?.min,
            max: filters.maxExperience || activeRequirements.experience?.max
          }
        }
        console.log("✅ Parsed JD requirements:", activeRequirements)
        results = await intelligentCandidateSearch(activeRequirements, transformedCandidates)
        break

      case "manual":
        // For manual search, intelligently parse the keywords query (comma-separated or natural language)
        // then merge with explicit filters for best results
        const manualQuery = query ? query.trim() : ''
        let parsedRequirements: any = {}
        
        if (manualQuery) {
          console.log("🧠 Processing manual search query with intelligent parsing:", manualQuery)
          // Try intelligent parsing - works for both comma-separated and natural language
          parsedRequirements = await parseSearchRequirement(manualQuery)
          console.log("✅ Parsed manual query requirements:", parsedRequirements)
        }
        
        // Merge parsed requirements with explicit filters (explicit filters take precedence)
        activeRequirements = {
          ...parsedRequirements,
          // Explicit filters override parsed ones
          location: filters.location || parsedRequirements.location,
          education: filters.education || parsedRequirements.education,
          experience: (filters.minExperience || filters.maxExperience) ? {
            min: filters.minExperience || parsedRequirements.experience?.min,
            max: filters.maxExperience || parsedRequirements.experience?.max
          } : parsedRequirements.experience,
          // If no skills parsed but we have query, use query as skills fallback
          skills: parsedRequirements.skills?.length > 0 
            ? parsedRequirements.skills 
            : (manualQuery ? manualQuery.split(',').map(k => k.trim()).filter(k => k) : [])
        }
        
        console.log("✅ Final manual search requirements:", activeRequirements)
        results = await intelligentCandidateSearch(activeRequirements, transformedCandidates)
        break

      default:
        return NextResponse.json({ error: "Invalid search type" }, { status: 400 })
    }

    // Filter out irrelevant results - only keep candidates with meaningful relevance scores
    // STRICT FILTERING: Increased threshold to ensure only highly relevant candidates are shown
    const MIN_RELEVANCE_THRESHOLD = 0.50 // 50% minimum match to be shown (increased from 35%)
    const filteredResults = results.filter((candidate: any) => {
      const relevanceScore = candidate.relevanceScore || 0
      // Additional check: if role is specified, ensure role match is meaningful
      if (activeRequirements.role && candidate.scoreBreakdown?.Role) {
        const roleMatch = candidate.scoreBreakdown.Role.percentage / 100
        // Role must have at least 30% match if role is specified
        if (roleMatch < 0.30) {
          console.log(`❌ Filtering out ${candidate.name}: Role match too low (${Math.round(roleMatch * 100)}%)`)
          return false
        }
      }
      return relevanceScore >= MIN_RELEVANCE_THRESHOLD
    })
    
    console.log(`Filtered ${results.length} results to ${filteredResults.length} relevant candidates (threshold: ${MIN_RELEVANCE_THRESHOLD}, strict role matching enabled)`)

    // Process pagination and generate summaries
    const responseData = await processResultsWithSummary(filteredResults, page, perPage, paginate, activeRequirements, includeSummary);

    // Log the search if HR user is logged in
    const hrUserCookie = request.cookies.get("hr_user")?.value
    if (hrUserCookie) {
      try {
        const hrUser = JSON.parse(hrUserCookie)
        if (hrUser && hrUser.id) {
           const resultsCount = paginate ? (responseData as any).total : (responseData as any[]).length;
           
           // Fire and forget logging
           supabaseAdmin.from('search_logs').insert({
              hr_user_id: hrUser.id,
              search_query: query || (searchType === 'jd' ? 'JD Analysis' : 'Manual Search'),
              filters: activeRequirements,
              results_count: resultsCount
           }).then(({ error }) => {
              if (error) console.error("Error logging search:", error)
           })
        }
      } catch (e) {
        console.error("Error parsing hr_user cookie for logging:", e)
      }
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Search failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
