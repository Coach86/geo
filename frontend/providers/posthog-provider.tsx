"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { Suspense, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

function SuspendedPostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthogClient = usePostHog()

  useEffect(() => {
    if (!posthogClient) return
    const queryString = searchParams.toString()
    posthogClient.capture('$pageview', {
      path: pathname + (queryString ? `?${queryString}` : ''),
    })
  }, [pathname, searchParams, posthogClient])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Skip PostHog initialization in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[PostHog] Skipping initialization in development mode')
      return
    }

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: '/ingest',
      ui_host: 'https://eu.posthog.com',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      capture_exceptions: true,
      debug: false,
    })
  }, [])

  // In development, just render children without PostHog provider
  if (process.env.NODE_ENV === 'development') {
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <SuspendedPostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}