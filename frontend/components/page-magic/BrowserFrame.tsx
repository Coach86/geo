'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RotateCw, X, Minus, Square, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrowserFrameProps {
  url: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onRefresh?: () => void;
  loading?: boolean;
}

export function BrowserFrame({ 
  url, 
  title = 'Browser', 
  children, 
  className,
  onRefresh,
  loading = false
}: BrowserFrameProps) {
  const displayUrl = url || 'about:blank';
  
  // Extract domain for display
  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  return (
    <Card className={cn("overflow-hidden h-full flex flex-col", className)}>
      {/* Browser Chrome */}
      <div className="bg-gray-100 border-b">
        {/* Window Controls */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {/* Mac-style window controls */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer" />
            </div>
          </div>
          
          <div className="text-xs font-medium text-gray-600">
            {title}
          </div>
          
          <div className="w-20" /> {/* Spacer for symmetry */}
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center gap-2 px-4 py-2">
          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onRefresh}
              disabled={!onRefresh || loading}
            >
              <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          {/* URL Bar */}
          <div className="flex-1 flex items-center gap-2 bg-white rounded-md px-3 py-1.5 text-sm">
            {/* Security Icon */}
            <div className="flex items-center gap-1">
              {url && url.startsWith('https://') && (
                <svg
                  className="w-3 h-3 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {/* URL Text */}
            <div className="flex-1 flex items-center gap-1 text-gray-700">
              <span className="font-medium">{getDomain(displayUrl)}</span>
              {url && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-500 truncate">
                    {(() => {
                      try {
                        const urlObj = new URL(url);
                        const path = urlObj.pathname + urlObj.search + urlObj.hash;
                        return path.length > 1 ? path.substring(1) : '';
                      } catch {
                        return '';
                      }
                    })()}
                  </span>
                </>
              )}
            </div>

            {/* Open External */}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 bg-white overflow-auto">
        {children}
      </div>
    </Card>
  );
}