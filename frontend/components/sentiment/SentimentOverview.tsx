"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

interface SentimentOverviewProps {
  sentimentScore: number;
  totalResponses: number;
}

export function SentimentOverview({ sentimentScore, totalResponses }: SentimentOverviewProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-dark-700 flex items-center gap-2">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={inView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Sparkles className="h-5 w-5 text-primary-600" />
            </motion.div>
            Overall Sentiment Score
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Percentage of positive sentiment across all AI model responses
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex items-center mb-1">
                  <motion.h3 
                    className="text-3xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={inView ? { scale: 1 } : { scale: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                  >
                    {sentimentScore}%
                  </motion.h3>
                  <motion.span 
                    className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={inView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                    transition={{ duration: 0.4, delay: 0.8 }}
                  >
                    Global Average
                  </motion.span>
                </div>
                <motion.p 
                  className="text-sm text-gray-600"
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.4, delay: 1.0 }}
                >
                  positive sentiment
                </motion.p>
              </motion.div>
              <motion.div 
                className="text-right"
                initial={{ opacity: 0, x: 20 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <motion.div 
                  className="text-sm font-medium text-gray-900"
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.7 }}
                >
                  Total Responses
                </motion.div>
                <motion.div 
                  className="text-2xl font-bold text-gray-900"
                  initial={{ scale: 0 }}
                  animate={inView ? { scale: 1 } : { scale: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                >
                  {totalResponses}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}