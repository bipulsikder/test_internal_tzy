"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { logger } from "@/lib/logger"
import { cachedFetchJson, invalidateSessionCache } from "@/lib/utils"

interface Candidate {
  _id: string
  name: string
  email: string
  phone: string
  currentRole: string
  desiredRole?: string
  currentCompany?: string
  location: string
  totalExperience: string
  highestQualification?: string
  degree?: string
  university?: string
  technicalSkills: string[]
  softSkills: string[]
  certifications?: string[]
  resumeText: string
  fileName: string
  fileUrl: string
  tags: string[]
  status: "new" | "reviewed" | "shortlisted" | "interviewed" | "selected" | "rejected" | "on-hold"
  rating?: number
  uploadedAt: string
  linkedinProfile?: string
  summary?: string
  notes?: string
  // Detailed sections
  workExperience?: Array<{ company: string; role: string; duration: string; description: string; responsibilities?: string[]; achievements?: string[]; technologies?: string[] }>
  education?: Array<{ degree: string; specialization: string; institution: string; year: string; percentage: string; grade?: string; coursework?: string[]; projects?: string[] }>
}

interface CandidateContextType {
  candidates: Candidate[]
  isLoading: boolean
  hasMore: boolean
  currentPage: number
  pageSize: number
  total: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  sortBy: string
  setSortBy: (sort: string) => void
  sortOrder: 'asc' | 'desc'
  setSortOrder: (order: 'asc' | 'desc') => void
  refreshCandidates: () => Promise<void>
  loadMoreCandidates: () => Promise<void>
  lastFetched: Date | null
}

const CandidateContext = createContext<CandidateContextType | undefined>(undefined)

export function CandidateProvider({ children }: { children: ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQueryState] = useState("")
  const [statusFilter, setStatusFilterState] = useState("all")
  const [sortBy, setSortByState] = useState("uploaded_at")
  const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>("desc")

  const fetchCandidates = useCallback(async (page = currentPage, perPage = pageSize, opts?: { force?: boolean }) => {
    try {
      setIsLoading(true)
      logger.info(`Fetching candidates from API (paginated): page=${page} perPage=${perPage} search=${searchQuery} status=${statusFilter} sort=${sortBy}:${sortOrder}`)
      const url = `/api/candidates?paginate=true&page=${page}&perPage=${perPage}&search=${encodeURIComponent(searchQuery)}&status=${encodeURIComponent(statusFilter)}&sortBy=${encodeURIComponent(sortBy)}&sortOrder=${encodeURIComponent(sortOrder)}`
      const data = await cachedFetchJson<any>(`internal:candidates:${url}`, url, undefined, {
        ttlMs: 5 * 60_000,
        force: Boolean(opts?.force),
      })
      logger.debug("API Response:", data)

      const items = Array.isArray(data) ? data : (data.items || [])
      const totalCount = Array.isArray(data) ? items.length : (data.total || items.length)
      const pageNum = Array.isArray(data) ? page : (data.page || page)
      const per = Array.isArray(data) ? perPage : (data.perPage || perPage)

      logger.info(`Fetched ${items.length} candidates of total ${totalCount}`)
      logger.info(`Setting candidates: page=${page} count=${items.length}`)

      setCandidates(items)
      setTotal(totalCount)
      setHasMore(pageNum * per < totalCount)
      setLastFetched(new Date())
    } catch (error) {
      logger.error('Error fetching candidates:', error)
    } finally {
      setIsLoading(false)
    }
  }, [pageSize, searchQuery, statusFilter, sortBy, sortOrder])

  const refreshCandidates = useCallback(async () => {
    logger.info("Refreshing candidates...")
    invalidateSessionCache("internal:candidates:", { prefix: true })
    await fetchCandidates(1, pageSize, { force: true })
    setCurrentPage(1)
  }, [fetchCandidates, pageSize])

  const loadMoreCandidates = useCallback(async () => {
    // Advance page if more results are available
    if (!hasMore) {
      logger.info("No more candidates to load")
      return
    }
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    await fetchCandidates(nextPage, pageSize)
  }, [hasMore, currentPage, pageSize, fetchCandidates])

  // Fetch on mount and whenever fetchCandidates changes
  useEffect(() => {
    logger.info("CandidateProvider mounted or fetchCandidates changed, fetching candidates...")
    fetchCandidates(currentPage, pageSize)
  }, [fetchCandidates, currentPage, pageSize])

  const setPage = (page: number) => {
    logger.info(`setPage called: ${page}`)
    setCurrentPage(page)
  }

  const setSearchQuery = useCallback((query: string) => {
    logger.info(`Search query changed to: "${query}", resetting to page 1`)
    setSearchQueryState(query)
    // Reset to page 1 when search changes to show results from beginning
    setCurrentPage(1)
  }, [])

  const setStatusFilter = useCallback((status: string) => {
    setStatusFilterState(status)
    setCurrentPage(1)
  }, [])

  const setSortBy = useCallback((sort: string) => {
    setSortByState(sort)
    setCurrentPage(1)
  }, [])

  const setSortOrder = useCallback((order: 'asc' | 'desc') => {
    setSortOrderState(order)
    setCurrentPage(1)
  }, [])

  const value = {
    candidates,
    isLoading,
    hasMore,
    currentPage,
    pageSize,
    total,
    setPage,
    setPageSize,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    refreshCandidates,
    loadMoreCandidates,
    lastFetched,
  }

  logger.debug("Context value updated:", {
    candidatesCount: candidates.length,
    isLoading,
    lastFetched,
    currentPage,
    pageSize,
    total,
  })

  return (
    <CandidateContext.Provider value={value}>
      {children}
    </CandidateContext.Provider>
  )
}

export function useCandidates() {
  const context = useContext(CandidateContext)
  if (context === undefined) {
    throw new Error('useCandidates must be used within a CandidateProvider')
  }
  return context
}
