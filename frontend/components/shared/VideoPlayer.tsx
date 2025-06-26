'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Subtitles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoPlayerProps {
  videoSrc: string;
  subtitlesSrc?: string;
  subtitlesType?: 'vtt' | 'srt';
  onClose: () => void;
}

export function VideoPlayer({ videoSrc, subtitlesSrc, subtitlesType = 'vtt', onClose }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [processedSubtitlesSrc, setProcessedSubtitlesSrc] = useState<string | undefined>(subtitlesSrc);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If subtitles are in SRT format, convert them to VTT
    if (subtitlesSrc && subtitlesType === 'srt') {
      fetch(subtitlesSrc)
        .then(response => response.text())
        .then(srtContent => {
          // Convert SRT to VTT format
          const vttContent = `WEBVTT\n\n${srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')}`;
          const blob = new Blob([vttContent], { type: 'text/vtt' });
          const url = URL.createObjectURL(blob);
          setProcessedSubtitlesSrc(url);
          
          // Cleanup function
          return () => URL.revokeObjectURL(url);
        })
        .catch(error => {
          console.error('Error loading subtitles:', error);
        });
    }
  }, [subtitlesSrc, subtitlesType]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const toggleSubtitles = () => {
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      if (tracks.length > 0) {
        tracks[0].mode = showSubtitles ? 'hidden' : 'showing';
        setShowSubtitles(!showSubtitles);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          ref={containerRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative w-full max-w-4xl bg-gray-900 rounded-lg overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Video element */}
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full aspect-video bg-black"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={togglePlay}
          >
            {processedSubtitlesSrc && (
              <track
                kind="subtitles"
                src={processedSubtitlesSrc}
                srcLang="en"
                label="English"
                default
              />
            )}
          </video>

          {/* Video controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center gap-4">
              {/* Play/Pause button */}
              <button
                onClick={togglePlay}
                className="p-2 hover:bg-white/20 rounded transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Time display */}
              <div className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              {/* Progress bar */}
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              />

              {/* Volume button */}
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/20 rounded transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Subtitles button */}
              {subtitlesSrc && (
                <button
                  onClick={toggleSubtitles}
                  className={`p-2 hover:bg-white/20 rounded transition-colors ${
                    showSubtitles ? 'bg-white/20' : ''
                  }`}
                >
                  <Subtitles className="w-5 h-5 text-white" />
                </button>
              )}

              {/* Fullscreen button */}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/20 rounded transition-colors"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}