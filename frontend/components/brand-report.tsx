"use client";

import ReportHeader from "./report-sections/report-header";
import ExecutiveSummary from "./report-sections/executive-summary";
import PulseSection from "./report-sections/pulse-section";
import ToneSection from "./report-sections/tone-section";
import AccordSection from "./report-sections/accord-section";
import ArenaSection from "./report-sections/arena-section";
import BrandBattleSection from "./report-sections/brand-battle-section";
import LiftSection from "./report-sections/lift-section";
import TraceSection from "./report-sections/trace-section";
import { ChevronUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

interface BrandReportProps {
  data: any;
}

// Animated section component with fade-in and slide-up effect
const AnimatedSection = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        delay: delay,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
    >
      {children}
    </motion.div>
  );
};

export default function BrandReport({ data }: BrandReportProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Fonction pour suivre le défilement
  useEffect(() => {
    const handleScroll = () => {
      // Afficher le bouton de retour en haut lorsque l'utilisateur a défilé
      if (window.scrollY > 500) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fonction pour faire défiler vers le haut
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Bouton de retour en haut */}
      {showScrollTop && (
        <motion.button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-all z-10"
          aria-label="Retour en haut"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronUp className="h-5 w-5" />
        </motion.button>
      )}

      <motion.div
        className="bg-gradient-to-r from-primary/90 to-primary-dark text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <motion.div
                  className="bg-white/20 backdrop-blur-sm p-2 rounded-lg mr-3"
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-white"
                  >
                    <motion.path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                    <motion.path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.7 }}
                    />
                    <motion.path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.9 }}
                    />
                  </svg>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <h1 className="text-2xl md:text-3xl font-bold">
                    Contexte.ai
                  </h1>
                  <p className="text-primary-foreground/80 mt-1 text-sm md:text-base">
                    Brand Intelligence in the LLM Era
                  </p>
                </motion.div>
              </div>
            </div>
            <motion.div
              className="text-right"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <p className="text-sm text-primary-foreground/80">
                {/* Use ISO date string format to prevent hydration errors */}
                {new Date().toISOString().split("T")[0]}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <AnimatedSection delay={0.2}>
          <motion.div
            className="mb-12 bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-100 shadow-sm"
            whileHover={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
            transition={{ duration: 0.3 }}
          >
            <motion.h2
              className="text-xl font-semibold text-gray-800 mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              LMM Brand Intelligence Report
            </motion.h2>
            <motion.p
              className="text-gray-600 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              This report analyzes how your brand is perceived across leading AI
              models. It measures visibility, sentiment, brand compliance, and
              competitive positioning to help you optimize your digital presence
              in the age of AI.
            </motion.p>
          </motion.div>
        </AnimatedSection>

        {/* Sections du rapport */}
        <div className="space-y-16">
          <AnimatedSection delay={0.3}>
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <ReportHeader brand={data.brand} metadata={data.metadata} />
            </motion.div>
          </AnimatedSection>

          <AnimatedSection delay={0.4}>
            <motion.div
              data-section="summary"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <ExecutiveSummary kpi={data.kpi} />
            </motion.div>
          </AnimatedSection>

          <AnimatedSection delay={0.5}>
            <motion.div
              data-section="pulse"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <PulseSection
                data={data.pulse}
                globalAverage={data.kpi.pulse.value}
              />
            </motion.div>
          </AnimatedSection>

          <AnimatedSection delay={0.6}>
            <motion.div
              data-section="tone"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <ToneSection
                data={data.tone}
                globalAverage={data.kpi.tone.value}
              />
            </motion.div>
          </AnimatedSection>

          <AnimatedSection delay={0.7}>
            <motion.div
              data-section="accord"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <AccordSection data={data.accord} />
            </motion.div>
          </AnimatedSection>

          {data.arena && (
            <AnimatedSection delay={0.8}>
              <motion.div
                data-section="arena"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.3 }}
              >
                <ArenaSection data={data.arena} />
              </motion.div>
            </AnimatedSection>
          )}

          {data.brandBattle && (
            <AnimatedSection delay={0.9}>
              <motion.div
                data-section="brand-battle"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.3 }}
              >
                <BrandBattleSection
                  brand={data.brand}
                  data={data.brandBattle}
                />
              </motion.div>
            </AnimatedSection>
          )}
          {data.trace && (
            <AnimatedSection delay={1.0}>
              <motion.div
                data-section="trace"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.3 }}
              >
                <TraceSection data={data.trace} />
              </motion.div>
            </AnimatedSection>
          )}

          {data.lift && (
            <AnimatedSection delay={1.1}>
              <motion.div
                data-section="lift"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.3 }}
              >
                <LiftSection data={data.lift} />
              </motion.div>
            </AnimatedSection>
          )}
        </div>

        {/* Pied de page */}
        <AnimatedSection delay={1.2}>
          <div className="mt-20 pt-10 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                className="md:col-span-2"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Next Steps
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Schedule a consultation with our team to discuss these
                  insights and develop a strategy to optimize your brand's
                  presence in AI responses. Our experts will help you implement
                  the recommendations and track your progress over time.
                </p>
              </motion.div>
              <motion.div
                className="bg-gray-50 p-6 rounded-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={{
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                }}
              >
                <h4 className="font-semibold text-gray-800 mb-3">Contact Us</h4>
                <p className="text-gray-600 mb-4">
                  Have questions about this report?
                </p>
                <div className="space-y-2 text-sm">
                  <motion.p
                    className="flex items-center"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    whileHover={{ x: 5 }}
                  >
                    <svg
                      className="h-5 w-5 mr-2 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    support@contexte.ai
                  </motion.p>
                  <motion.p
                    className="flex items-center"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    whileHover={{ x: 5 }}
                  >
                    <svg
                      className="h-5 w-5 mr-2 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    +1 (555) 123-4567
                  </motion.p>
                </div>
              </motion.div>
            </div>

            <motion.div
              className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="text-sm text-gray-500 mb-4 md:mb-0">
                {/* Use static year to prevent hydration issues */}© 2025
                Contexte.ai — All Rights Reserved
              </div>
              <div className="flex space-x-6">
                <motion.a
                  href="#"
                  className="text-gray-500 hover:text-primary transition-colors"
                  whileHover={{ scale: 1.05, color: "#0070f3" }}
                >
                  Privacy Policy
                </motion.a>
                <motion.a
                  href="#"
                  className="text-gray-500 hover:text-primary transition-colors"
                  whileHover={{ scale: 1.05, color: "#0070f3" }}
                >
                  Terms of Service
                </motion.a>
                <motion.a
                  href="#"
                  className="text-gray-500 hover:text-primary transition-colors"
                  whileHover={{ scale: 1.05, color: "#0070f3" }}
                >
                  Contact Us
                </motion.a>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
