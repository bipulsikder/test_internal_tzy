export const RESUME_BUCKET_NAME = "resume-files"
export const CLIENT_LOGOS_BUCKET_NAME = "client-logos"

export const RESUME_BUCKET_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
] as const

export const CLIENT_LOGOS_BUCKET_ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const

