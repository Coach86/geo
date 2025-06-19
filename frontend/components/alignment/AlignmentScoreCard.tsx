import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface AlignmentScoreCardProps {
  brandName: string;
  averageScore: number;
  scoreVariation: number;
  loading?: boolean;
}

export function AlignmentScoreCard({
  brandName,
  averageScore,
  scoreVariation,
  loading = false
}: AlignmentScoreCardProps) {
  const getTrendIcon = () => {
    if (scoreVariation > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (scoreVariation < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (scoreVariation > 0) return "text-green-600";
    if (scoreVariation < 0) return "text-red-600";
    return "text-gray-400";
  };

  const formatVariation = (variation: number) => {
    if (variation === 0) return "No change";
    return `${variation > 0 ? "+" : ""}${variation}%`;
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <CardContent className="p-6 h-full flex flex-col justify-center">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">Alignment Score</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-bold text-primary-600">{averageScore}%</h2>
            {scoreVariation !== 0 && (
              <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="text-sm font-medium">{formatVariation(scoreVariation)}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Average alignment across selected reports
          </p>
        </div>
      </CardContent>
    </Card>
  );
}