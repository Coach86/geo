"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProfileRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to project-settings
    router.replace("/project-settings")
  }, [router])

  return null
}