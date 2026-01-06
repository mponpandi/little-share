import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, TrendingUp, Heart, AlertCircle, FileText, Loader2, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RankingResult {
  request_id: string;
  score: number;
  emotional_score: number;
  urgency_score: number;
  clarity_score: number;
  specificity_score: number;
  summary: string;
  receiver_name: string;
  message: string;
}

interface AIRequestAnalysisProps {
  itemId: string;
  itemName: string;
  pendingRequestsCount: number;
  onSelectRequest: (requestId: string) => void;
  onClose: () => void;
}

export function AIRequestAnalysis({
  itemId,
  itemName,
  pendingRequestsCount,
  onSelectRequest,
  onClose,
}: AIRequestAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rankings, setRankings] = useState<RankingResult[] | null>(null);

  const analyzeRequests = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-requests", {
        body: { item_id: itemId },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setRankings(data.rankings);
      toast.success(`Analyzed ${data.total_analyzed} requests`);
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze requests");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-teal";
    if (score >= 50) return "text-gold";
    return "text-muted-foreground";
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-teal/20";
    if (score >= 50) return "bg-gold/20";
    return "bg-muted";
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Request Analysis
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Let AI analyze {pendingRequestsCount} requests for "{itemName}" and recommend the most genuine need.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!rankings ? (
          <div className="text-center py-4">
            <Button
              onClick={analyzeRequests}
              disabled={isAnalyzing}
              className="gradient-accent text-white"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Requests
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              AI will score each request based on emotional intensity, urgency, clarity & specificity
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Trophy className="w-4 h-4 text-gold" />
              <span>Ranked by AI Need Score</span>
            </div>

            {rankings.map((ranking, index) => (
              <Card
                key={ranking.request_id}
                className={`border ${index === 0 ? "border-teal/50 bg-teal/5" : "border-border"}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${getScoreBg(ranking.score)} ${getScoreColor(ranking.score)} font-bold`}
                      >
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{ranking.receiver_name}</span>
                      {index === 0 && (
                        <Badge className="bg-teal/20 text-teal text-xs">
                          AI Recommended
                        </Badge>
                      )}
                    </div>
                    <span className={`text-lg font-bold ${getScoreColor(ranking.score)}`}>
                      {ranking.score}/100
                    </span>
                  </div>

                  {/* Score breakdown */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-pink-500" />
                      <span className="text-muted-foreground">Emotional:</span>
                      <span className="font-medium">{ranking.emotional_score}/30</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-orange-500" />
                      <span className="text-muted-foreground">Urgency:</span>
                      <span className="font-medium">{ranking.urgency_score}/30</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-500" />
                      <span className="text-muted-foreground">Clarity:</span>
                      <span className="font-medium">{ranking.clarity_score}/20</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-purple-500" />
                      <span className="text-muted-foreground">Specificity:</span>
                      <span className="font-medium">{ranking.specificity_score}/20</span>
                    </div>
                  </div>

                  {/* Overall progress bar */}
                  <Progress value={ranking.score} className="h-1.5 mb-2" />

                  {/* AI Summary */}
                  <p className="text-xs text-muted-foreground italic mb-3">
                    "{ranking.summary}"
                  </p>

                  {/* Original message preview */}
                  {ranking.message && ranking.message !== "No message provided" && (
                    <div className="bg-muted/50 rounded p-2 text-xs mb-3">
                      <span className="text-muted-foreground">Message: </span>
                      <span className="line-clamp-2">{ranking.message}</span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={() => onSelectRequest(ranking.request_id)}
                    className={index === 0 ? "w-full gradient-accent text-white" : "w-full"}
                    variant={index === 0 ? "default" : "outline"}
                  >
                    {index === 0 ? "Accept AI Recommendation" : "Accept This Request"}
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRankings(null)}
              className="w-full text-muted-foreground"
            >
              Re-analyze Requests
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
