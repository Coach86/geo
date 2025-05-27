"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Meh, Frown } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

interface SentimentCounts {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

interface SentimentDistributionProps {
  sentimentCounts: SentimentCounts;
}

export function SentimentDistribution({ sentimentCounts }: SentimentDistributionProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const calculatePercentage = (count: number) =>
    Math.round((count / sentimentCounts.total) * 100);

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        delay: 0.2 + (index * 0.2),
        ease: "easeOut"
      }
    })
  };

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Positive Sentiment */}
      <motion.div
        custom={0}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={cardVariants}
        whileHover={{ scale: 1.02, y: -5 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-[#E3F2FD] border-[#90CAF9]">
          <CardHeader className="pb-4 bg-[#90CAF9] bg-opacity-30">
            <CardTitle className="text-lg font-semibold text-[#0D47A1] flex items-center gap-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={inView ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Heart className="h-5 w-5" />
              </motion.div>
              Positive Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <motion.div 
              className="text-3xl font-bold text-[#0D47A1]"
              initial={{ scale: 0 }}
              animate={inView ? { scale: 1 } : { scale: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              {sentimentCounts.positive}{" "}
              <span className="text-sm font-normal">responses</span>
            </motion.div>
            <motion.div 
              className="text-sm text-[#1976D2] mt-1"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.8 }}
            >
              {calculatePercentage(sentimentCounts.positive)}% of total
            </motion.div>
            <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#2196F3] rounded-full"
                initial={{ scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 1, delay: 1.0, ease: "easeOut" }}
                style={{
                  transformOrigin: "left",
                  width: `${calculatePercentage(sentimentCounts.positive)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Neutral Sentiment */}
      <motion.div
        custom={1}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={cardVariants}
        whileHover={{ scale: 1.02, y: -5 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-[#EDE7F6] border-[#B39DDB]">
          <CardHeader className="pb-4 bg-[#B39DDB] bg-opacity-30">
            <CardTitle className="text-lg font-semibold text-[#4527A0] flex items-center gap-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={inView ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <Meh className="h-5 w-5" />
              </motion.div>
              Neutral Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <motion.div 
              className="text-3xl font-bold text-[#4527A0]"
              initial={{ scale: 0 }}
              animate={inView ? { scale: 1 } : { scale: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              {sentimentCounts.neutral}{" "}
              <span className="text-sm font-normal">responses</span>
            </motion.div>
            <motion.div 
              className="text-sm text-[#673AB7] mt-1"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 1.0 }}
            >
              {calculatePercentage(sentimentCounts.neutral)}% of total
            </motion.div>
            <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#673AB7] rounded-full"
                initial={{ scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
                style={{
                  transformOrigin: "left",
                  width: `${calculatePercentage(sentimentCounts.neutral)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Negative Sentiment */}
      <motion.div
        custom={2}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={cardVariants}
        whileHover={{ scale: 1.02, y: -5 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-[#FCE4EC] border-[#F48FB1]">
          <CardHeader className="pb-4 bg-[#F48FB1] bg-opacity-30">
            <CardTitle className="text-lg font-semibold text-[#AD1457] flex items-center gap-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={inView ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 0.4, delay: 0.8 }}
              >
                <Frown className="h-5 w-5" />
              </motion.div>
              Negative Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <motion.div 
              className="text-3xl font-bold text-[#AD1457]"
              initial={{ scale: 0 }}
              animate={inView ? { scale: 1 } : { scale: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              {sentimentCounts.negative}{" "}
              <span className="text-sm font-normal">responses</span>
            </motion.div>
            <motion.div 
              className="text-sm text-[#C2185B] mt-1"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 1.2 }}
            >
              {calculatePercentage(sentimentCounts.negative)}% of total
            </motion.div>
            <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#C2185B] rounded-full"
                initial={{ scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 1, delay: 1.4, ease: "easeOut" }}
                style={{
                  transformOrigin: "left",
                  width: `${calculatePercentage(sentimentCounts.negative)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}