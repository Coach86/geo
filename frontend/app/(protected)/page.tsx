"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProtectedRootPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home page
    router.replace("/home")
  }, [router])

  return null
}