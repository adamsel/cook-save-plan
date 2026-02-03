import { useState } from 'react';
import { Sparkles, CheckCircle2, Lightbulb, AlertTriangle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Insight {
  type: 'positive' | 'suggestion' | 'warning';
  title: string;
  description: string;
  actionable?: string;
}

interface AnalysisResponse {
  insights: Insight[];
  summary: string;
}

interface NutritionData {
  avgDailyCalories: number;
  avgDailyProtein: number;
  avgDailyCarbs: number;
  avgDailyFat: number;
  totalMeals: number;
  daysPlanned: number;
}

interface UserGoals {
  primaryGoal: 'weight_loss' | 'muscle_gain' | 'balanced' | 'none';
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

interface MealPlanAIInsightsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nutrition: NutritionData;
  householdSize: number;
  userGoals?: UserGoals;
}

export function MealPlanAIInsights({
  open,
  onOpenChange,
  nutrition,
  householdSize,
  userGoals,
}: MealPlanAIInsightsProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    if (!session?.access_token) {
      toast({
        title: "Sign in required",
        description: "Please sign in to use AI insights.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meal-plan-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            nutrition,
            householdSize,
            userGoals: userGoals?.primaryGoal !== 'none' ? userGoals : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze meal plan');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze meal plan');
      toast({
        title: "Analysis failed",
        description: err instanceof Error ? err.message : 'Please try again',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch analysis when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (newOpen && !analysis && !isLoading) {
      fetchAnalysis();
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-blue-500" />;
    }
  };

  const getInsightBg = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Meal Plan Insights
          </DialogTitle>
          <DialogDescription>
            Personalized analysis of your weekly nutrition
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Analyzing your meal plan...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mb-4" />
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={fetchAnalysis}>
                Try Again
              </Button>
            </div>
          )}

          {analysis && !isLoading && (
            <>
              {/* Summary */}
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm font-medium">{analysis.summary}</p>
              </div>

              {/* Insights */}
              <div className="space-y-3">
                {analysis.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      getInsightBg(insight.type)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {insight.description}
                        </p>
                        {insight.actionable && (
                          <p className="text-sm font-medium mt-2 text-primary">
                            {insight.actionable}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Refresh button */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchAnalysis}
                  disabled={isLoading}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Refresh Analysis
                </Button>
              </div>
            </>
          )}

          {/* Nutrition snapshot */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Your Weekly Averages (per person)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Calories</p>
                <p className="text-lg font-semibold">{Math.round(nutrition.avgDailyCalories)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Protein</p>
                <p className="text-lg font-semibold">{Math.round(nutrition.avgDailyProtein)}g</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Carbs</p>
                <p className="text-lg font-semibold">{Math.round(nutrition.avgDailyCarbs)}g</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Fat</p>
                <p className="text-lg font-semibold">{Math.round(nutrition.avgDailyFat)}g</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
