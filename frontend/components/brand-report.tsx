"use client"

import ReportHeader from "./report-sections/report-header"
import ExecutiveSummary from "./report-sections/executive-summary"
import PulseSection from "./report-sections/pulse-section"
import ToneSection from "./report-sections/tone-section"
import AccordSection from "./report-sections/accord-section"
import ArenaSection from "./report-sections/arena-section"
import ArenaBattleSection from "./report-sections/arena-battle-section"
import LiftSection from "./report-sections/lift-section"
import TraceSection from "./report-sections/trace-section"
import { ChevronUp } from "lucide-react"
import { useState, useEffect } from "react"

interface BrandReportProps {
  data: any
}

export default function BrandReport({ data }: BrandReportProps) {
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Fonction pour suivre le défilement
  useEffect(() => {
    const handleScroll = () => {
      // Afficher le bouton de retour en haut lorsque l'utilisateur a défilé
      if (window.scrollY > 500) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Fonction pour faire défiler vers le haut
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="relative">
      {/* Bouton de retour en haut */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-all z-10 animate-fade-in"
          aria-label="Retour en haut"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}

      <div className="bg-gradient-to-r from-primary/90 to-primary-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg mr-3">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-white"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Contexte.ai</h1>
                  <p className="text-primary-foreground/80 mt-1 text-sm md:text-base">
                    Brand Intelligence in the LLM Era
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary-foreground/80">
                {/* Use ISO date string format to prevent hydration errors */}
                {new Date().toISOString().split('T')[0]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="mb-12 bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">LMM Brand Intelligence Report</h2>
          <p className="text-gray-600 leading-relaxed">
            This report analyzes how your brand is perceived across leading AI models. It measures visibility,
            sentiment, brand compliance, and competitive positioning to help you optimize your digital presence in the
            age of AI.
          </p>
        </div>

        {/* Sections du rapport */}
        <div className="space-y-16">
          <ReportHeader brand={data.brand} metadata={data.metadata} />

          <div data-section="summary">
            <ExecutiveSummary kpi={data.kpi} />
          </div>

          <div data-section="pulse">
            <PulseSection data={data.pulse} />
          </div>

          <div data-section="tone">
            <ToneSection data={data.tone} />
          </div>

          <div data-section="accord">
            <AccordSection data={data.accord} />
          </div>

          <div data-section="arena">
            <ArenaSection data={data.arena} />
          </div>

          <div data-section="battle">
            <ArenaBattleSection data={data.arena.battle} />
          </div>

          {data.trace && (
            <div data-section="trace">
              <TraceSection data={data.trace} />
            </div>
          )}

          {data.lift && (
            <div data-section="lift">
              <LiftSection data={data.lift} />
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="mt-20 pt-10 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Next Steps</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Schedule a consultation with our team to discuss these insights and develop a strategy to optimize your
                brand's presence in AI responses. Our experts will help you implement the recommendations and track your
                progress over time.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Contact Us</h4>
              <p className="text-gray-600 mb-4">Have questions about this report?</p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center">
                  <svg className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  support@contexte.ai
                </p>
                <p className="flex items-center">
                  <svg className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  +1 (555) 123-4567
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500 mb-4 md:mb-0">
              {/* Use static year to prevent hydration issues */}
              © 2025 Contexte.ai — All Rights Reserved
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-500 hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-500 hover:text-primary transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-gray-500 hover:text-primary transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
