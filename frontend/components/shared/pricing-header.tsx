"use client";

import Link from "next/link";

export function PricingHeader() {
  return (
    <header className="w-full border-b bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img src="/logo-small.png" className="w-24" alt="Mint Logo" />
          </Link>
          
          {/* Navigation - optional for future expansion */}
          <div className="flex items-center space-x-4">
            {/* You can add navigation items here if needed */}
          </div>
        </div>
      </div>
    </header>
  );
}