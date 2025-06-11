"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CitationsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to explorer
    router.replace("/explorer")
  }, [router])

  return null
}