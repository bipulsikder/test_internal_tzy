import { GoogleGenerativeAI } from "@google/generative-ai"
import { SupabaseCandidateService } from "./supabase-candidates"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash"

export interface SearchRequirement {
  role?: string;
  experience?: {
    min?: number;
    max?: number;
    exact?: number;
  };
  location?: string;
  skills?: string[];
  education?: string;
  certifications?: string[];
  industry?: string;
  specificRequirements?: string[];
  impliedResponsibilities?: string[];
}

export async function parseSearchRequirement(naturalLanguageQuery: string): Promise<SearchRequirement> {
  console.log("=== Parsing Search Requirement with Gemini ===")
  console.log("Query:", naturalLanguageQuery)

  if (!process.env.GEMINI_API_KEY) {
    console.log("⚠️ GEMINI_API_KEY not configured, using keyword extraction")
    return extractBasicRequirements(naturalLanguageQuery)
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: DEFAULT_GEMINI_MODEL
    })
    
    const prompt = `You are an expert HR recruiter with deep knowledge of logistics and transportation industry. Parse this job requirement and extract structured information with semantic understanding.
    
    CRITICAL INSTRUCTION: Analyze the job role deeply to understand what this person actually DOES. Generate a list of "impliedResponsibilities" that are standard for this role in logistics, even if not explicitly mentioned.

"${naturalLanguageQuery}"

Extract and return ONLY a JSON object with this exact structure:
{
  "role": "Job title/position (e.g., 'Fleet Manager', 'Truck Driver', 'Warehouse Manager')",
  "experience": {
    "min": minimum years of experience (number or null),
    "max": maximum years of experience (number or null),
    "exact": exact years if specified (number or null)
  },
  "location": "Required location/city/region",
  "skills": ["Array of required technical and soft skills"],
  "education": "Education requirement",
  "certifications": ["Required certifications"],
  "industry": "Industry type (logistics, transportation, warehousing, supply chain)",
  "specificRequirements": ["Any other specific requirements including salary info"],
  "impliedResponsibilities": ["Array of 5-7 specific daily tasks, KPIs, and responsibilities for this role in logistics (e.g., for 'Ops Exec': 'driver coordination', 'route planning', 'POD collection')"]
}

Advanced Semantic Parsing Rules:
- "Warehouse Manager" → role: "Warehouse Manager", skills: ["warehouse management", "inventory control"], impliedResponsibilities: ["inventory audit", "staff supervision", "safety compliance", "inward/outward management"]
- "SAP software" → skills: ["SAP"], specificRequirements: ["SAP proficiency"]
- "LIFO and FEFO" → skills: ["inventory management", "LIFO", "FEFO"]
- "Minimum 3 years" → experience: {min: 3}
- "Up to ₹30,000" → specificRequirements: ["salary up to 30000 INR"]
- "Lodhwal, Ludhiana" → location: "Ludhiana"
- "organizational and leadership abilities" → skills: ["organizational skills", "leadership"]
- "proficiency in" → skills: [extract the skill]
- "strong knowledge of" → skills: [extract the knowledge area]
- "excellent" → skills: [extract the following skill/ability]
- "5+ years" means min: 5
- "2-5 years" means min: 2, max: 5
- "Clean license" means certifications: ["Clean Driving License"]
- "CDL" means certifications: ["Commercial Driver License"]
- "Hazmat" means certifications: ["Hazmat Certification"]
- Location names should be extracted as-is
- Include both hard skills and soft skills
- Be precise and don't make assumptions

Semantic Understanding:
- Extract implicit skills from job titles
- Recognize salary information and ranges
- Identify inventory management methods (LIFO, FIFO, FEFO)
- Understand software requirements (SAP, ERP, etc.)
- Extract location information accurately including area names
- Parse experience requirements (minimum, maximum, range)
- Identify soft skills and leadership requirements
- GENERATE implied responsibilities based on the role to help match candidates who mention these tasks in their resume/summary.

Return ONLY the JSON object, no additional text.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    
    console.log("Gemini parsing response:", text)
    
    try {
      const parsed = JSON.parse(text)
      console.log("✅ Successfully parsed requirements:", parsed)
      return parsed
    } catch (parseError) {
      console.log("❌ Failed to parse Gemini response, using fallback")
      return extractBasicRequirements(naturalLanguageQuery)
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error("❌ Gemini parsing failed:", errorMessage)
    
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      console.error("⚠️ Model not found. Check GEMINI_MODEL env var or API key permissions.")
    }

    console.log("🔄 Falling back to basic requirement extraction")
    return extractBasicRequirements(naturalLanguageQuery)
  }
}

function extractBasicRequirements(query: string): SearchRequirement {
  const lowerQuery = query.toLowerCase()
  const requirements: SearchRequirement = {}

  // Extract experience with various patterns including salary-based experience hints
  const expPatterns = [
    /(\d+)\+?\s*years?/,           // "5+ years", "5 years"
    /(\d+)-(\d+)\s*years?/,        // "2-5 years"
    /minimum\s*(\d+)\s*years?/,    // "minimum 5 years"
    /at\s*least\s*(\d+)\s*years?/  // "at least 5 years"
  ]
  
  for (const pattern of expPatterns) {
    const match = lowerQuery.match(pattern)
    if (match) {
      if (match.length === 3) { // Range pattern
        requirements.experience = { min: parseInt(match[1]), max: parseInt(match[2]) }
      } else {
        requirements.experience = { min: parseInt(match[1]) }
      }
      break
    }
  }

  // Extract location with better coverage including area/locality names
  const locationKeywords = [
    'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'pune', 'hyderabad', 'ahmedabad',
    'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad', 'navi mumbai', 'thane',
    'jaipur', 'lucknow', 'chandigarh', 'indore', 'bhopal', 'patna', 'ranchi', 'ludhiana',
    'lodhwal', 'manesar', 'bawal', 'dharuhera', 'bhiwadi', 'neemrana'
  ]
  
  for (const location of locationKeywords) {
    if (lowerQuery.includes(location)) {
      requirements.location = location
      break
    }
  }

  // Extract role with comprehensive coverage including new logistics roles
  const roleKeywords = [
    'fleet manager', 'truck driver', 'logistics coordinator', 'warehouse manager', 
    'supply chain manager', 'transport manager', 'operations manager', 'delivery manager',
    'fleet supervisor', 'logistics executive', 'warehouse executive', 'transport coordinator',
    'inventory manager', 'store manager', 'godown manager', 'warehouse incharge', 
    'logistics manager', 'supply chain executive', 'procurement manager',
    'transport executive', 'transport supervisor', 'fleet executive', 'operations executive',
    // Singular/Plural variations
    'operation executive', 'operation manager', 'logistic executive', 'logistic manager'
  ]
  
  for (const role of roleKeywords) {
    if (lowerQuery.includes(role)) {
      requirements.role = role
      break
    }
  }

  // Extract skills with semantic understanding
  const skillKeywords = [
    'gps tracking', 'fleet management', 'route optimization', 'supply chain', 'inventory management',
    'warehouse management', 'transportation', 'logistics', 'vehicle tracking', 'driver management',
    'fuel management', 'maintenance scheduling', 'compliance', 'safety regulations', 'dot regulations',
    'clean license', 'cdl', 'commercial driver license', 'hazmat', 'hazmat certification',
    'sap', 'erp', 'lifo', 'fefo', 'fifo', 'organizational skills', 'leadership', 'team management',
    'data analysis', 'problem solving', 'communication skills'
  ]
  
  const foundSkills = skillKeywords.filter(skill => lowerQuery.includes(skill))
  if (foundSkills.length > 0) {
    requirements.skills = foundSkills
  }

  // Extract certifications with comprehensive coverage
  const certKeywords = [
    'cdl', 'commercial driver license', 'hazmat', 'hazmat certification', 'clean license',
    'dot certification', 'safety certification', 'forklift certification', 'driving license'
  ]
  
  const foundCerts = certKeywords.filter(cert => lowerQuery.includes(cert))
  if (foundCerts.length > 0) {
    requirements.certifications = foundCerts
  }

  // Extract education
  const educationKeywords = ['bachelor', 'master', 'diploma', 'degree', 'b.tech', 'mba', 'graduate']
  for (const edu of educationKeywords) {
    if (lowerQuery.includes(edu)) {
      requirements.education = edu
      break
    }
  }

  // Extract salary information
  const salaryPatterns = [
    /₹?(\d+(?:,\d+)*)/,  // ₹30,000 or 30000
    /rs\.?\s*(\d+(?:,\d+)*)/,  // Rs. 30000
    /salary.*?₹?(\d+(?:,\d+)*)/  // "salary up to ₹30,000"
  ]
  
  for (const pattern of salaryPatterns) {
    const match = lowerQuery.match(pattern)
    if (match) {
      requirements.specificRequirements = requirements.specificRequirements || []
      requirements.specificRequirements.push(`salary ${match[1].replace(/,/g, '')} INR`)
      break
    }
  }

  console.log("📋 Basic requirement extraction results:", requirements)
  return requirements
}

export interface MatchDetail {
  category: 'Role' | 'Experience' | 'Location' | 'Skills' | 'Education' | 'Responsibility';
  status: 'match' | 'partial' | 'miss';
  score: number;
  message: string;
  weight: number;
  maxWeight: number;
}

export interface ScoreBreakdown {
  [key: string]: { earned: number; max: number; percentage: number };
}

export async function intelligentCandidateSearch(
  requirements: SearchRequirement, 
  candidates: any[]
): Promise<any[]> {
  console.log("=== Intelligent Candidate Search ===")
  console.log("Requirements:", JSON.stringify(requirements, null, 2))
  console.log("Total candidates:", candidates.length)

  // First, try Supabase skill-based search if we have skills
  let supabaseResults: any[] = []
  if (requirements.skills && requirements.skills.length > 0) {
    try {
      console.log("Trying Supabase skill-based search with skills:", requirements.skills)
      supabaseResults = await SupabaseCandidateService.searchCandidatesBySkills(requirements.skills)
      console.log(`Supabase found ${supabaseResults.length} candidates with matching skills`)
    } catch (error) {
      console.log("Supabase skill search failed, continuing with local filtering:", error)
    }
  }

  // If no Supabase results, use all candidates
  const candidatesToFilter = supabaseResults.length > 0 ? supabaseResults : candidates
  console.log(`Filtering through ${candidatesToFilter.length} candidates`)

  // Intelligent filtering based on parsed requirements
  const filteredCandidates = candidatesToFilter.map(candidate => {
    let score = 0
    let matchDetails: MatchDetail[] = []
    let missingCriteria: string[] = []
    let scoreBreakdown: ScoreBreakdown = {}
    
    console.log(`\n📝 Analyzing candidate: ${candidate.name} (${candidate.currentRole})`)

    // Weights Configuration (Total: 100)
    const weights = {
      role: 30,
      responsibility: 20,
      experience: 15,
      skills: 15,
      location: 15,
      education: 5
    }

    let totalMaxPossibleScore = 0

    // Role matching (30%) - STRICT: Role must match or be very similar
    if (requirements.role) {
      totalMaxPossibleScore += weights.role
      const roleMatch = calculateRoleMatch(requirements.role, candidate)
      const earned = roleMatch * weights.role;
      score += earned;
      
      scoreBreakdown['Role'] = { earned: Math.round(earned), max: weights.role, percentage: Math.round(roleMatch * 100) };

      if (roleMatch > 0.8) {
        matchDetails.push({
          category: 'Role',
          status: 'match',
          score: roleMatch,
          message: `Role matches "${requirements.role}"`,
          weight: earned,
          maxWeight: weights.role
        })
      } else if (roleMatch >= 0.3) {
        matchDetails.push({
          category: 'Role',
          status: 'partial',
          score: roleMatch,
          message: `Related role "${candidate.currentRole}"`,
          weight: earned,
          maxWeight: weights.role
        })
      } else {
        // Role doesn't match at all - this is a critical mismatch
        matchDetails.push({
          category: 'Role',
          status: 'miss',
          score: roleMatch,
          message: `Role mismatch (${candidate.currentRole || 'Not specified'}) - will be filtered out`,
          weight: earned,
          maxWeight: weights.role
        })
        missingCriteria.push(`Role: ${requirements.role}`)
      }
    }

    // Implied Responsibilities Matching (20%)
    if (requirements.impliedResponsibilities && requirements.impliedResponsibilities.length > 0) {
      totalMaxPossibleScore += weights.responsibility
      const respScore = calculateResponsibilityMatch(requirements.impliedResponsibilities, candidate)
      const earned = respScore * weights.responsibility;
      score += earned;
      
      scoreBreakdown['Responsibility'] = { earned: Math.round(earned), max: weights.responsibility, percentage: Math.round(respScore * 100) };

      matchDetails.push({
        category: 'Responsibility',
        status: respScore > 0.6 ? 'match' : respScore > 0.2 ? 'partial' : 'miss',
        score: respScore,
        message: `${Math.round(respScore * 100)}% match on key tasks`,
        weight: earned,
        maxWeight: weights.responsibility
      })
    }

    // Experience matching (15%)
    if (requirements.experience) {
      totalMaxPossibleScore += weights.experience
      const expScore = calculateExperienceScore(requirements.experience, candidate.totalExperience)
      const earned = expScore * weights.experience;
      score += earned;
      
      scoreBreakdown['Experience'] = { earned: Math.round(earned), max: weights.experience, percentage: Math.round(expScore * 100) };

      if (expScore > 0.8) {
        matchDetails.push({
          category: 'Experience',
          status: 'match',
          score: expScore,
          message: `Meets experience (${candidate.totalExperience})`,
          weight: earned,
          maxWeight: weights.experience
        })
      } else if (expScore > 0.2) {
        matchDetails.push({
          category: 'Experience',
          status: 'partial',
          score: expScore,
          message: `Partial experience (${candidate.totalExperience})`,
          weight: earned,
          maxWeight: weights.experience
        })
      } else {
        matchDetails.push({
          category: 'Experience',
          status: 'miss',
          score: expScore,
          message: `Experience mismatch (Req: ${requirements.experience.min}+)`,
          weight: earned,
          maxWeight: weights.experience
        })
        missingCriteria.push(`Experience`)
      }
    }

    // Location matching (15%)
    if (requirements.location) {
      totalMaxPossibleScore += weights.location
      const locationScore = calculateLocationScore(requirements.location, candidate.location)
      const earned = locationScore * weights.location;
      score += earned;
      
      scoreBreakdown['Location'] = { earned: Math.round(earned), max: weights.location, percentage: Math.round(locationScore * 100) };

      if (locationScore > 0.8) {
        matchDetails.push({
          category: 'Location',
          status: 'match',
          score: locationScore,
          message: `Matches location`,
          weight: earned,
          maxWeight: weights.location
        })
      } else if (locationScore > 0.2) {
        matchDetails.push({
          category: 'Location',
          status: 'partial',
          score: locationScore,
          message: `Nearby (${candidate.location})`,
          weight: earned,
          maxWeight: weights.location
        })
      } else {
        matchDetails.push({
          category: 'Location',
          status: 'miss',
          score: locationScore,
          message: `Location mismatch`,
          weight: earned,
          maxWeight: weights.location
        })
        missingCriteria.push(`Location`)
      }
    }

    // Skills matching (15%)
    if (requirements.skills && requirements.skills.length > 0) {
      totalMaxPossibleScore += weights.skills
      const skillsScore = calculateSkillsScore(requirements.skills, candidate)
      const earned = skillsScore * weights.skills;
      score += earned;
      
      scoreBreakdown['Skills'] = { earned: Math.round(earned), max: weights.skills, percentage: Math.round(skillsScore * 100) };

      if (skillsScore > 0.6) {
        matchDetails.push({
          category: 'Skills',
          status: 'match',
          score: skillsScore,
          message: `Good skills match`,
          weight: earned,
          maxWeight: weights.skills
        })
      } else if (skillsScore > 0.1) {
        matchDetails.push({
          category: 'Skills',
          status: 'partial',
          score: skillsScore,
          message: `Some skills match`,
          weight: earned,
          maxWeight: weights.skills
        })
      } else {
        matchDetails.push({
          category: 'Skills',
          status: 'miss',
          score: skillsScore,
          message: `Missing skills`,
          weight: earned,
          maxWeight: weights.skills
        })
        missingCriteria.push(`Skills`)
      }
    }

    // Education matching (5%)
    if (requirements.education) {
      totalMaxPossibleScore += weights.education
      const eduScore = calculateEducationScore(requirements.education, candidate)
      const earned = eduScore * weights.education;
      score += earned;
      
      scoreBreakdown['Education'] = { earned: Math.round(earned), max: weights.education, percentage: Math.round(eduScore * 100) };

      matchDetails.push({
        category: 'Education',
        status: eduScore > 0.8 ? 'match' : eduScore > 0.2 ? 'partial' : 'miss',
        score: eduScore,
        message: candidate.highestQualification || 'Not specified',
        weight: earned,
        maxWeight: weights.education
      })
    }

    // Normalize Score based on active requirements
    // If no requirements provided, score is 0
    const normalizedScore = totalMaxPossibleScore > 0 
      ? (score / totalMaxPossibleScore) * 100 
      : 0

    console.log(`📊 Raw score: ${score}/${totalMaxPossibleScore} -> Normalized: ${Math.round(normalizedScore)}%`)

    return {
      ...candidate,
      relevanceScore: Math.min(0.99, normalizedScore / 100),
      matchPercentage: Math.round(normalizedScore),
      matchDetails,
      scoreBreakdown,
      gapAnalysis: missingCriteria,
      parsedRequirements: requirements
    }
  })

  // Sort by relevance score and filter out poor matches
  // STRICT FILTERING: Only show candidates with meaningful matches
  const relevantCandidates = filteredCandidates
    .filter(candidate => {
      // Minimum 50% relevance score
      if (candidate.relevanceScore < 0.50) return false
      
      // CRITICAL: If role is specified, candidate MUST have matching or similar role (at least 30% role match)
      if (requirements.role) {
        const roleMatch = calculateRoleMatch(requirements.role, candidate)
        if (roleMatch < 0.3) {
          console.log(`❌ Filtering out ${candidate.name}: Role mismatch (${candidate.currentRole} vs ${requirements.role}, match: ${roleMatch})`)
          return false
        }
      }
      
      return true
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  console.log(`Found ${relevantCandidates.length} relevant candidates`)
  return relevantCandidates
}

function calculateRoleMatch(requiredRole: string, candidate: any): number {
  const candidateRole = (candidate.currentRole || candidate.desiredRole || '').toLowerCase()
  const required = requiredRole.toLowerCase()
  
  if (!candidateRole) return 0

  // Normalize helper to handle singular/plural variations (e.g. "operations" vs "operation")
  const normalize = (str: string) => str.replace(/s\b/g, '').replace(/\s+/g, ' ').trim()
  
  const normCandidate = normalize(candidateRole)
  const normRequired = normalize(required)

  // Exact match (including normalized)
  if (candidateRole.includes(required) || required.includes(candidateRole) || 
      normCandidate.includes(normRequired) || normRequired.includes(normCandidate)) return 1

  // Comprehensive role synonyms mapping with semantic understanding
  const roleSynonyms: { [key: string]: string[] } = {
    'fleet manager': ['fleet management', 'transportation manager', 'logistics manager', 'operations manager', 'fleet operations manager', 'vehicle fleet manager'],
    'truck driver': ['driver', 'heavy vehicle driver', 'commercial driver', 'truck operator', 'heavy truck driver', 'delivery driver', 'commercial vehicle driver'],
    'logistics coordinator': ['logistics executive', 'supply chain coordinator', 'logistics specialist', 'operations coordinator', 'logistics officer'],
    'warehouse manager': ['warehouse executive', 'store manager', 'inventory manager', 'warehouse supervisor', 'store incharge', 'warehouse incharge', 'godown manager', 'warehouse operations manager', 'store operations manager', 'inventory operations manager'],
    'supply chain manager': ['supply chain executive', 'procurement manager', 'operations manager', 'logistics manager', 'scm manager'],
    'transport manager': ['transportation manager', 'fleet manager', 'logistics manager', 'dispatch manager', 'transport operations manager'],
    'transport executive': ['transport manager', 'logistics executive', 'fleet executive', 'transport coordinator', 'operations executive', 'operation executive'],
    'operations manager': ['operations executive', 'operations head', 'operations supervisor', 'fleet manager', 'logistics manager', 'operations incharge', 'operation manager'],
    'warehouse executive': ['warehouse manager', 'store executive', 'inventory executive', 'warehouse supervisor', 'store keeper', 'godown executive'],
    'inventory manager': ['inventory executive', 'stock manager', 'warehouse manager', 'store manager', 'inventory controller'],
    'logistics manager': ['logistics executive', 'logistics coordinator', 'logistics head', 'logistics operations manager', 'supply chain manager'],
    'operations executive': ['operations manager', 'operation executive', 'operations officer', 'operations coordinator'],
    'operation executive': ['operations executive', 'operations manager', 'operations officer', 'operations coordinator']
  }

  // Check synonyms against both original and normalized requirement
  const synonyms = roleSynonyms[required] || roleSynonyms[normRequired] || []
  for (const synonym of synonyms) {
    if (candidateRole.includes(synonym) || normalize(synonym).includes(normCandidate)) return 0.8
  }

  // Check if candidate has relevant skills for the role
  const allSkills = [
    ...(candidate.technicalSkills || []),
    ...(candidate.softSkills || []),
    ...(candidate.tags || [])
  ].map(skill => skill.toLowerCase())

  const roleSkillMap: { [key: string]: string[] } = {
    'fleet manager': ['fleet', 'transportation', 'logistics', 'vehicle', 'route', 'driver management', 'fuel management'],
    'truck driver': ['driving', 'vehicle', 'transportation', 'license', 'delivery', 'logistics', 'commercial driving'],
    'logistics coordinator': ['logistics', 'supply chain', 'coordination', 'planning', 'inventory', 'transportation'],
    'warehouse manager': ['warehouse', 'inventory', 'store', 'godown', 'stock', 'warehousing', 'storage', 'inventory control', 'stock management'],
    'supply chain manager': ['supply chain', 'procurement', 'logistics', 'inventory', 'operations', 'vendor management'],
    'transport manager': ['transportation', 'fleet', 'logistics', 'route', 'dispatch', 'vehicle management'],
    'transport executive': ['transportation', 'logistics', 'fleet', 'coordination', 'operations', 'vehicle']
  }

  const requiredSkills = roleSkillMap[required] || []
  const skillMatches = allSkills.filter(skill => 
    requiredSkills.some(reqSkill => skill.includes(reqSkill))
  )

  // STRICT: If role doesn't match and only has some related skills, give very low score
  // Only allow skill-based matching if there's significant skill overlap (at least 2-3 skills)
  if (skillMatches.length >= 2) {
    return 0.4 // Partial match based on skills only
  }
  
  // If role doesn't match at all, return 0 (will be filtered out)
  return 0
}

function calculateExperienceScore(requiredExp: any, candidateExp: string): number {
  if (!candidateExp) return 0.3
  
  // More robust experience parsing
  const expPatterns = [
    /(\d+(?:\.\d+)?)\s*years?/,           // "5 years", "3.5 years"
    /(\d+(?:\.\d+)?)\s*yr/,               // "5 yr", "3.5 yr"
    /(\d+)\s*years?\s*(\d+)\s*months?/,  // "2 years 6 months"
    /(\d+)\s*months?/                     // "18 months"
  ]
  
  let candidateYears = 0
  let foundMatch = false
  
  for (const pattern of expPatterns) {
    const match = candidateExp.match(pattern)
    if (match) {
      if (match.length === 3 && candidateExp.includes('months')) {
        // Handle "2 years 6 months" format
        candidateYears = parseFloat(match[1]) + (parseFloat(match[2]) / 12)
      } else if (candidateExp.includes('months') && !candidateExp.includes('years')) {
        // Handle "18 months" format
        candidateYears = parseFloat(match[1]) / 12
      } else {
        // Handle "5 years" or "5 yr" format
        candidateYears = parseFloat(match[1])
      }
      foundMatch = true
      break
    }
  }
  
  if (!foundMatch) return 0.3
  
  if (requiredExp.exact) {
    return Math.abs(candidateYears - requiredExp.exact) <= 1 ? 1 : 0.3
  }
  
  if (requiredExp.min && candidateYears >= requiredExp.min) {
    return requiredExp.max && candidateYears <= requiredExp.max ? 1 : 0.8
  }
  
  // If no specific requirement, give some score based on having experience
  return candidateYears > 0 ? 0.5 : 0.2
}

function calculateLocationScore(requiredLocation: string, candidateLocation: string): number {
  if (!candidateLocation) return 0.3
  
  const required = requiredLocation.toLowerCase().trim()
  const candidate = candidateLocation.toLowerCase().trim()
  
  // 1. Direct match (Exact or Substring)
  if (candidate.includes(required) || required.includes(candidate)) return 1
  
  // 2. Location Clusters (Bidirectional Proximity)
  const locationClusters: string[][] = [
    // NCR Region
    ['delhi', 'new delhi', 'ncr', 'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad', 'greater noida', 'manesar', 'bawal', 'dharuhera', 'bhiwadi', 'neemrana'],
    // Mumbai Region
    ['mumbai', 'bombay', 'navi mumbai', 'thane', 'kalyan', 'bhiwandi', 'vasai', 'virar', 'panvel'],
    // Pune Region (sometimes considered near Mumbai for broader searches)
    ['pune', 'pimpri', 'chinchwad', 'chakan', 'talegaon'],
    // Punjab Region
    ['ludhiana', 'chandigarh', 'mohali', 'jalandhar', 'amritsar', 'patiala', 'lodhwal'],
    // Bangalore
    ['bangalore', 'bengaluru', 'electronic city', 'whitefield', 'hosur'],
    // Chennai
    ['chennai', 'madras', 'kanchipuram', 'sriperumbudur', 'oragadam'],
    // Hyderabad
    ['hyderabad', 'secunderabad', 'cyberabad'],
    // Kolkata
    ['kolkata', 'calcutta', 'howrah', 'salt lake'],
    // Gujarat
    ['ahmedabad', 'gandhinagar', 'vadodara', 'surat', 'sanand'],
    // MP
    ['indore', 'dewas', 'pithampur', 'bhopal']
  ]
  
  // Find which cluster(s) the required location belongs to
  for (const cluster of locationClusters) {
    const isRequiredInCluster = cluster.some(city => required.includes(city) || city.includes(required))
    
    if (isRequiredInCluster) {
      // Check if candidate is in the same cluster
      const isCandidateInCluster = cluster.some(city => candidate.includes(city) || city.includes(candidate))
      
      if (isCandidateInCluster) {
        return 0.85 // High score for nearby/same-region matches
      }
    }
  }
  
  return 0.1
}

function calculateResponsibilityMatch(responsibilities: string[], candidate: any): number {
  // Aggregate all relevant text from the candidate profile
  const textToSearch = [
    candidate.resumeText || '',
    candidate.summary || '',
    candidate.currentRole || '',
    candidate.keyAchievements ? candidate.keyAchievements.join(' ') : '',
    ...(candidate.workExperience || []).map((w: any) => `${w.role} ${w.description}`),
    ...(candidate.projects || []).map((p: any) => p.description)
  ].join(' ').toLowerCase();

  if (!textToSearch.trim()) return 0;

  let matchCount = 0;
  let totalWeight = 0;

  for (const resp of responsibilities) {
    const phrase = resp.toLowerCase();
    
    // Exact phrase match gets high score
    if (textToSearch.includes(phrase)) {
      matchCount += 1.5;
    } else {
      // Keyword matching: split responsibility into keywords
      const keywords = phrase.split(/\s+/).filter(w => w.length > 3 && !['with', 'that', 'this', 'from', 'into', 'manage', 'handle'].includes(w));
      
      if (keywords.length > 0) {
        const matchedKeywords = keywords.filter(k => textToSearch.includes(k));
        const matchRatio = matchedKeywords.length / keywords.length;
        
        // If more than 60% of significant keywords match, count it
        if (matchRatio >= 0.6) {
          matchCount += matchRatio;
        }
      }
    }
    totalWeight += 1;
  }

  // Normalize score between 0 and 1
  // We don't expect 100% match of all AI-generated responsibilities, so we scale it
  const finalScore = Math.min(1, matchCount / Math.max(1, totalWeight * 0.7));
  
  return finalScore;
}

function calculateSkillsScore(requiredSkills: string[], candidate: any): number {
  const allCandidateSkills = [
    ...(candidate.technicalSkills || []),
    ...(candidate.softSkills || []),
    ...(candidate.tags || [])
  ].map(skill => skill.toLowerCase())
  
  if (allCandidateSkills.length === 0) return 0.2
  
  let matches = 0
  for (const requiredSkill of requiredSkills) {
    const required = requiredSkill.toLowerCase()
    
    // Semantic skill matching with synonyms and related concepts
    const skillSynonyms: { [key: string]: string[] } = {
      'sap': ['sap', 'erp', 'enterprise resource planning', 'sap software'],
      'inventory management': ['inventory', 'stock management', 'inventory control', 'stock control', 'inventory tracking'],
      'lifo': ['lifo', 'inventory method', 'inventory management'],
      'fefo': ['fefo', 'fifo', 'inventory method', 'inventory management'],
      'warehouse management': ['warehouse', 'godown', 'store management', 'warehouse operations'],
      'organizational skills': ['organization', 'organizational', 'planning', 'coordination'],
      'leadership': ['leadership', 'leader', 'team management', 'people management', 'supervisory'],
      'fleet management': ['fleet', 'vehicle management', 'transportation management', 'fleet operations'],
      'gps tracking': ['gps', 'vehicle tracking', 'fleet tracking', 'gps monitoring'],
      'route optimization': ['route planning', 'route optimization', 'logistics planning', 'delivery planning']
    }
    
    // Check for direct match or synonym match
    const hasMatch = allCandidateSkills.some(skill => {
      if (skill.includes(required) || required.includes(skill)) return true
      
      // Check synonyms
      const synonyms = skillSynonyms[required] || []
      return synonyms.some(synonym => skill.includes(synonym) || synonym.includes(skill))
    })
    
    if (hasMatch) matches++
  }
  
  return matches / requiredSkills.length
}

function calculateEducationScore(requiredEducation: string, candidate: any): number {
  const candidateEducation = (candidate.highestQualification || candidate.degree || '').toLowerCase()
  const required = requiredEducation.toLowerCase()
  
  if (!candidateEducation) return 0.3
  
  if (candidateEducation.includes(required) || required.includes(candidateEducation)) return 1
  
  // Education level matching
  const educationLevels = ['high school', 'diploma', 'bachelor', 'master', 'phd']
  const candidateLevel = educationLevels.findIndex(level => candidateEducation.includes(level))
  const requiredLevel = educationLevels.findIndex(level => required.includes(level))
  
  if (candidateLevel >= 0 && requiredLevel >= 0) {
    return candidateLevel >= requiredLevel ? 0.8 : 0.4
  }
  
  return 0.2
}
