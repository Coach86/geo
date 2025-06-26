"use client"

import { useState } from "react"
import { BarChart3, PlayCircle } from "lucide-react"
import { SvgLoader } from "@/components/ui/svg-loader"
import { VideoPlayer } from "./VideoPlayer"

export function ProcessingLoader() {
  const [showVideo, setShowVideo] = useState(false)

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
        <div className="relative mb-8">
          {/* Animated background circles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-32 rounded-full bg-accent-100 animate-pulse" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 rounded-full bg-accent-200 animate-pulse animation-delay-200" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-accent-300 animate-pulse animation-delay-400" />
          </div>

          {/* Center icon */}
          <div className="relative flex items-center justify-center h-32 w-32">
            <div className="absolute inset-0 flex items-center justify-center">
              <SvgLoader className="text-accent-600" size="md" />
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
          Your report is being prepared
        </h3>

        <p className="text-gray-600 text-center max-w-md mb-6">
          We will send you an email notification when it is ready.
        </p>

        {/* Onboarding video message */}
        <button
          onClick={() => setShowVideo(true)}
          className="flex items-center gap-3 px-6 py-3 bg-accent-50 hover:bg-accent-100 rounded-lg transition-colors group mb-6"
        >
          <PlayCircle className="w-6 h-6 text-accent-600 group-hover:text-accent-700" />
          <span className="text-lg font-medium text-accent-700 group-hover:text-accent-800">
            Check out our onboarding video
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Please come back in a few minutes.</span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-8">
          <div className="h-2 w-2 rounded-full bg-accent-500 animate-bounce" />
          <div className="h-2 w-2 rounded-full bg-accent-500 animate-bounce animation-delay-200" />
          <div className="h-2 w-2 rounded-full bg-accent-500 animate-bounce animation-delay-400" />
        </div>
      </div>

      {/* Video player modal */}
      {showVideo && (
        <VideoPlayer
          videoSrc="/videos/onboarding.mp4"
          subtitlesSrc="/videos/onboarding.srt"
          subtitlesType="srt"
          onClose={() => setShowVideo(false)}
        />
      )}
    </>
  )
}
