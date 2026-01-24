import { cookies } from "next/headers"
import { InternalShell } from "@/components/internal-shell"

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isHrUser = Boolean(cookieStore.get("hr_user")?.value)
  return <InternalShell isHrUser={isHrUser}>{children}</InternalShell>
}

