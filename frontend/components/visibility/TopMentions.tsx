"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

interface SpontaneousData {
  summary?: {
    topMentions?: string[];
    topMentionCounts?: {
      mention: string;
      count: number;
    }[];
  };
}

interface TopMentionsProps {
  spontaneousData: SpontaneousData | null;
  loadingSpontaneous: boolean;
}

export function TopMentions({ spontaneousData, loadingSpontaneous }: TopMentionsProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-dark-700 flex items-center gap-2">
            <motion.div
              initial={{ rotate: -10, scale: 0 }}
              animate={inView ? { rotate: 0, scale: 1 } : { rotate: -10, scale: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Brain className="h-5 w-5 text-accent-600" />
            </motion.div>
            Top Mentions
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Brands most frequently mentioned across AI responses
          </p>
        </CardHeader>
      <CardContent>
        {loadingSpontaneous ? (
          <motion.div 
            className="flex items-center justify-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-sm text-gray-500">Loading top mentions...</div>
          </motion.div>
        ) : (
          <>
            <motion.div 
              className="flex flex-wrap gap-2 mt-2"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              {spontaneousData?.summary?.topMentions && spontaneousData.summary.topMentions.length > 0 ? (
                // Check if we have actual counts from spontaneous data
                spontaneousData.summary.topMentionCounts ? (
                  // Display mentions with counts if available
                  spontaneousData.summary.topMentionCounts.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                      transition={{ 
                        duration: 0.4, 
                        delay: 0.8 + (index * 0.1),
                        ease: "easeOut"
                      }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Badge
                        variant={index < 3 ? "default" : "outline"}
                        className={`
                          ${index < 3
                            ? "bg-secondary-100 text-secondary-800 border-secondary-200"
                            : "border-gray-300 text-gray-700"
                          }
                          text-sm font-medium px-3 py-1
                        `}
                      >
                        {item.mention} ({item.count})
                        {index === 0 && (
                          <motion.span
                            className="ml-1 text-xs"
                            initial={{ rotate: 0 }}
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 1, delay: 1.5 }}
                          >
                            👑
                          </motion.span>
                        )}
                      </Badge>
                    </motion.div>
                  ))
                ) : (
                  // Fallback to displaying just mentions without counts
                  spontaneousData.summary.topMentions.map((mention, index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                      transition={{ 
                        duration: 0.4, 
                        delay: 0.8 + (index * 0.1),
                        ease: "easeOut"
                      }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Badge
                        variant={index < 3 ? "default" : "outline"}
                        className={`
                          ${index < 3
                            ? "bg-secondary-100 text-secondary-800 border-secondary-200"
                            : "border-gray-300 text-gray-700"
                          }
                          text-sm font-medium px-3 py-1
                        `}
                      >
                        {mention}
                        {index === 0 && (
                          <motion.span
                            className="ml-1 text-xs"
                            initial={{ rotate: 0 }}
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 1, delay: 1.5 }}
                          >
                            👑
                          </motion.span>
                        )}
                      </Badge>
                    </motion.div>
                  ))
                )
              ) : (
                <motion.p 
                  className="text-sm text-gray-400 italic"
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                >
                  No top mentions found.
                </motion.p>
              )}
            </motion.div>
            <motion.p 
              className="text-sm text-gray-600 mt-3"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 1.2 }}
            >
              These are the brands most frequently mentioned in responses.
            </motion.p>
          </>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
}