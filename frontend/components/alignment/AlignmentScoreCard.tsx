import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";

interface AlignmentScoreCardProps {
  brandName: string;
  averageScore: number;
  scoreVariation: number;
  loading?: boolean;
  isAllTime?: boolean;
}

export function AlignmentScoreCard({
  brandName,
  averageScore,
  scoreVariation,
  loading = false,
  isAllTime = false
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
      <Card className="border-0 shadow-sm h-full">
        <CardHeader className="pb-4">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        </CardHeader>
        <CardContent className="flex flex-col">
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center">
              <div className="h-12 bg-gray-200 rounded w-24 mx-auto animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-orange-600" />
          Alignment Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center">
            <div className="flex items-baseline gap-3 justify-center">
              <div className="text-4xl font-bold text-primary-600">
                {averageScore}%
              </div>
              {!isAllTime && scoreVariation !== 0 && (
                <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span className="font-medium">{formatVariation(scoreVariation)}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Average alignment across selected reports
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}