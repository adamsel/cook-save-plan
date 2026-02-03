import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NutritionData {
  avgDailyCalories: number;
  avgDailyProtein: number;
  avgDailyCarbs: number;
  avgDailyFat: number;
  totalMeals: number;
  daysPlanned: number;
}

interface AnalysisRequest {
  nutrition: NutritionData;
  householdSize: number;
  userGoals?: {
    primaryGoal?: 'weight_loss' | 'muscle_gain' | 'balanced' | 'none';
    targetCalories?: number;
    targetProtein?: number;
    targetCarbs?: number;
    targetFat?: number;
    dietType?: string;
  };
}

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

const SYSTEM_PROMPT = `You are a nutrition advisor analyzing a weekly meal plan. Provide personalized, actionable insights.

IMPORTANT: Respond with ONLY a valid JSON object, no markdown, no code blocks, no explanation. Just the raw JSON.

Output format:
{
  "insights": [
    {
      "type": "positive|suggestion|warning",
      "title": "Short title (4-6 words)",
      "description": "1-2 sentence explanation with SPECIFIC numbers",
      "actionable": "Specific action with quantities (e.g., 'Add Greek yogurt (+15g protein) to breakfast')"
    }
  ],
  "summary": "One sentence overall assessment mentioning their goal if provided"
}

Rules:
- Provide exactly 4 insights structured as:
  1. One BIG PICTURE insight about overall week patterns
  2. Two SPECIFIC ACTION insights with exact meal swaps
  3. One MOTIVATIONAL insight (progress, celebration, or encouragement)
- ALWAYS include specific numbers (grams, calories, percentages)
- When user has a goal, frame ALL insights around that goal
- For weight loss: focus on calorie reduction strategies, satiety
- For muscle gain: focus on protein timing and amounts
- For balanced: focus on macro distribution across meals
- Be SPECIFIC: "Swap white rice for cauliflower rice (-30g carbs)" not "eat fewer carbs"
- Mention actual meal slots when possible (e.g., "breakfast is low in protein")
- Don't be alarmist - frame improvements positively
- Output valid JSON only`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.AI_FUNCTION);
  if (!rateLimitResult.allowed) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const { nutrition, householdSize, userGoals } = (await req.json()) as AnalysisRequest;

    if (!nutrition) {
      return new Response(
        JSON.stringify({ error: "No nutrition data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      console.error("GOOGLE_AI_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate macros percentages
    const totalCals = nutrition.avgDailyCalories || 1;
    const proteinCals = (nutrition.avgDailyProtein || 0) * 4;
    const carbCals = (nutrition.avgDailyCarbs || 0) * 4;
    const fatCals = (nutrition.avgDailyFat || 0) * 9;

    const proteinPct = Math.round((proteinCals / totalCals) * 100);
    const carbPct = Math.round((carbCals / totalCals) * 100);
    const fatPct = Math.round((fatCals / totalCals) * 100);

    // Build the analysis prompt
    let userPrompt = `Analyze this weekly meal plan for a household of ${householdSize}:

DAILY AVERAGES (per person):
- Calories: ${Math.round(nutrition.avgDailyCalories)} kcal
- Protein: ${Math.round(nutrition.avgDailyProtein)}g (${proteinPct}% of calories)
- Carbs: ${Math.round(nutrition.avgDailyCarbs)}g (${carbPct}% of calories)
- Fat: ${Math.round(nutrition.avgDailyFat)}g (${fatPct}% of calories)

PLAN COVERAGE:
- ${nutrition.daysPlanned} days planned
- ${nutrition.totalMeals} total meals`;

    // Add goal-specific context
    if (userGoals?.primaryGoal && userGoals.primaryGoal !== 'none') {
      const goalLabels: Record<string, string> = {
        'weight_loss': 'Weight Loss - Focus on calorie deficit and satiety',
        'muscle_gain': 'Muscle Gain - Focus on high protein and adequate calories',
        'balanced': 'Balanced Macros - Focus on 40/30/30 carbs/protein/fat distribution',
      };
      userPrompt += `\n\n🎯 USER'S PRIMARY GOAL: ${goalLabels[userGoals.primaryGoal] || userGoals.primaryGoal}`;

      if (userGoals.targetCalories) {
        const calorieDiff = Math.round(nutrition.avgDailyCalories) - userGoals.targetCalories;
        userPrompt += `\n- Target calories: ${userGoals.targetCalories}/day (currently ${calorieDiff > 0 ? '+' : ''}${calorieDiff} from target)`;
      }
      if (userGoals.targetProtein) {
        const proteinDiff = Math.round(nutrition.avgDailyProtein) - userGoals.targetProtein;
        userPrompt += `\n- Target protein: ${userGoals.targetProtein}g/day (currently ${proteinDiff > 0 ? '+' : ''}${proteinDiff}g from target)`;
      }
      if (userGoals.targetCarbs) {
        const carbsDiff = Math.round(nutrition.avgDailyCarbs) - userGoals.targetCarbs;
        userPrompt += `\n- Target carbs: ${userGoals.targetCarbs}g/day (currently ${carbsDiff > 0 ? '+' : ''}${carbsDiff}g from target)`;
      }
      if (userGoals.targetFat) {
        const fatDiff = Math.round(nutrition.avgDailyFat) - userGoals.targetFat;
        userPrompt += `\n- Target fat: ${userGoals.targetFat}g/day (currently ${fatDiff > 0 ? '+' : ''}${fatDiff}g from target)`;
      }

      userPrompt += `\n\nProvide 4 insights that help this user achieve their ${userGoals.primaryGoal.replace('_', ' ')} goal. Be specific with numbers and meal swap suggestions.`;
    } else if (userGoals?.targetCalories) {
      userPrompt += `\n\nUSER GOAL: Target ${userGoals.targetCalories} calories/day`;
      userPrompt += `\n\nProvide 4 specific, actionable insights about this meal plan.`;
    } else {
      userPrompt += `\n\nProvide 4 general nutrition insights about this meal plan. Be specific with numbers and meal swap suggestions.`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          }
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`AI API error: ${response.status}`, errorBody);
      return new Response(
        JSON.stringify({ error: `AI service error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!content) {
      return new Response(
        JSON.stringify({
          insights: [{
            type: 'suggestion',
            title: 'Analysis unavailable',
            description: 'Unable to analyze this meal plan. Try again later.'
          }],
          summary: 'Analysis could not be completed.'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON response
    try {
      const analysis = JSON.parse(content) as AnalysisResponse;
      return new Response(
        JSON.stringify(analysis),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch {
      // Try to extract JSON from content
      const firstBrace = content.indexOf('{');
      if (firstBrace !== -1) {
        let depth = 0;
        let endIdx = -1;
        for (let i = firstBrace; i < content.length; i++) {
          if (content[i] === '{') depth++;
          if (content[i] === '}') depth--;
          if (depth === 0) { endIdx = i; break; }
        }
        if (endIdx !== -1) {
          try {
            const analysis = JSON.parse(content.substring(firstBrace, endIdx + 1)) as AnalysisResponse;
            return new Response(
              JSON.stringify(analysis),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } catch {
            // Fall through
          }
        }
      }

      // Return fallback response
      return new Response(
        JSON.stringify({
          insights: [{
            type: 'suggestion',
            title: 'Analysis unavailable',
            description: 'Unable to parse meal plan analysis. Try again later.'
          }],
          summary: 'Analysis could not be completed.'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("Meal plan analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
