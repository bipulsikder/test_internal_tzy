
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash"

export async function generateCandidateSummary(candidate: any, requirements: any): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return "AI summary not available (API Key missing)."
  }

  try {
    const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL })
    
    const prompt = `
      Act as an expert Recruiter.
      Provide a "Why this candidate?" insight (max 40 words).
      
      Requirements:
      ${JSON.stringify(requirements)}

      Candidate:
      Role: ${candidate.currentRole}
      Exp: ${candidate.totalExperience}
      Loc: ${candidate.location}
      Skills: ${(candidate.technicalSkills || []).slice(0, 10).join(', ')}

      Task:
      - Explain the match logic clearly.
      - Highlight KEY matches (Role, Location, Skills).
      - Mention CRITICAL gaps if any.
      - Style: Professional, Insightful, Direct.
      - Example: "Strong match for Fleet Manager role in Hyderabad. Has required GPS tracking skills and relevant experience. Good fit."
      - Example: "Role matches but location mismatch (Mumbai vs Delhi). Good backup candidate if location is flexible."
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text().trim()
  } catch (error) {
    console.error("Error generating candidate summary:", error)
    return "Summary generation failed."
  }
}
