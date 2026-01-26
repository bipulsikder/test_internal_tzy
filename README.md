# Truckinzy Platform

This repo contains the **internal admin app** for Truckinzy plus shared backend code.

If you are new to the project, start here:

- **Non‑technical product overview**: [docs/product-overview.md](docs/product-overview.md)
- **Internal app architecture (for engineers)**: [docs/internal-architecture.md](docs/internal-architecture.md)
- **Board app architecture (candidate‑facing, separate repo)**: `board-app/docs/board-app-architecture.md` (mirrored here for reference)

Below is the original description of the resume upload flow, which is still valid.

## 🚀 New Resume Upload Flow

The platform now implements an intelligent resume upload process that optimizes storage and provides detailed error reporting:

### 1. **Blob Storage Check First**
- **Before parsing**: The system first checks if the resume file already exists in Vercel Blob storage
- **Smart reuse**: If the file exists but isn't associated with any candidate, it reuses the existing file
- **Eliminates duplicates**: Prevents unnecessary re-uploads of the same files

### 2. **Conditional Parsing**
- **Only when needed**: Resume parsing only occurs when the file is new or needs to be processed
- **Efficient processing**: Existing files are downloaded from blob storage and parsed without re-uploading
- **Cost optimization**: Reduces API calls and storage costs

### 3. **Enhanced Error Handling**
- **Detailed parsing failures**: When parsing fails, the system provides comprehensive error information:
  - Specific error details and reasons
  - File information (name, type, size, timestamp)
  - Actionable suggestions to fix the issue
  - Retry functionality for failed uploads

### 4. **Error Categories**
- **Parsing Failures**: When AI cannot extract information from the resume
- **Duplicate Detection**: When the resume already exists in the system
- **File Validation**: When files are invalid, too large, or unsupported
- **Network/System Errors**: When upload or processing fails

### 5. **User Experience Improvements**
- **Clear status indicators**: Visual feedback for each file status
- **Actionable buttons**: Retry, remove, and download options
- **Detailed error display**: Comprehensive error information with suggestions
- **Progress tracking**: Real-time upload and processing progress

## 🔧 Technical Implementation

### Blob Storage Functions
```typescript
// Check if file exists before uploading
const fileExistsCheck = await checkFileExistsInBlob(file.name)

// Reuse existing file or upload new one
if (fileExistsCheck.exists) {
  // Reuse existing blob URL
  blobUrl = fileExistsCheck.url
} else {
  // Parse and upload new file
  const parsedData = await parseResume(file)
  const uploadResult = await uploadFileToBlob(file)
}
```

### Error Response Format
```typescript
// Parsing failure response
{
  error: "Resume parsing failed",
  parsingFailed: true,
  details: "Failed to extract text from PDF",
  fileName: "resume.pdf",
  fileType: "application/pdf",
  fileSize: 2048576,
  suggestions: [
    "Check if the file is corrupted or password protected",
    "Ensure the file contains readable text content",
    "Try converting the file to a different format"
  ],
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

## 📁 File Structure

```
app/
├── api/
│   ├── upload-resume/route.ts     # Enhanced upload with blob check
│   └── candidates/
│       └── [id]/reparse/route.ts  # Reparse existing files
lib/
├── vercel-blob-utils.ts           # Blob storage utilities
├── resume-parser.ts               # AI-powered parsing
└── google-sheets.ts               # Database operations
components/
├── upload-section.tsx             # Enhanced upload UI
└── candidate-dashboard.tsx        # Candidate management
```

## 🎯 Benefits

1. **Storage Efficiency**: Eliminates duplicate file uploads
2. **Cost Reduction**: Minimizes API calls and storage costs
3. **Better UX**: Clear error messages and actionable feedback
4. **Faster Processing**: Reuses existing files when possible
5. **Reliability**: Comprehensive error handling and retry mechanisms

## 🚀 Getting Started

1. **Environment Setup**: Configure your `.env` file with required API keys
2. **Install Dependencies**: Run `npm install`
3. **Start Development**: Run `npm run dev`
4. **Upload Resumes**: Use the enhanced upload interface with automatic blob checking

The platform now provides a much more efficient and user-friendly resume upload experience while maintaining all existing functionality.
