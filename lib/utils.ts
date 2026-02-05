import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBoardAppBaseUrl() {
  const raw = String(process.env.NEXT_PUBLIC_BOARD_APP_BASE_URL || process.env.BOARD_APP_BASE_URL || "").trim()
  const base = raw.length ? raw : "http://localhost:3001"
  return base.replace(/\/$/, "")
}

export function getBoardJobApplyUrl(jobId: string) {
  return `${getBoardAppBaseUrl()}/jobs/${jobId}/apply`
}

export function normalizeExternalUrl(url: string | null | undefined) {
  const raw = String(url || "").trim()
  if (!raw) return ""
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^\/\//.test(raw)) return `https:${raw}`
  return `https://${raw}`
}
