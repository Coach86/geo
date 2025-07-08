'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="ml-6 mt-1.5 relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={copyToClipboard}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-3 w-3 text-accent" />
          ) : (
            <Copy className="h-3 w-3 text-gray-500" />
          )}
        </button>
      </div>
      <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 overflow-x-auto">
        <code className="text-xs font-mono text-gray-700 whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}