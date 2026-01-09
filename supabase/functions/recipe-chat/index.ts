import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RecipeData {
  title: string;
  description?: string;
  imageUrl?: string;
  sourceUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: Array<{
    id: string;
    item: string;
    quantity: number | null;
    unit: string;
    notes?: string;
  }>;
  instructions: string[];
  category?: string;
  tags?: string[];
  nutrition?: {
    perServing: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
    source: "ai_estimate";
    confidence: "High" | "Medium" | "Low";
    notes?: string;
  };
}

const SYSTEM_PROMPT = `You are a helpful recipe assistant for a meal planning app called Recipe Stash. Your job is to help users add recipes to their collection.

You can:
1. Extract recipes from URLs - when a user shares a URL, I'll scrape the webpage and you parse the recipe
2. Parse pasted recipe text into structured data
3. Help users create recipes from scratch through conversation
4. Estimate nutrition information based on ingredients

When you identify or create a recipe, respond with a JSON object in the following format wrapped in \`\`\`json code blocks:

\`\`\`json
{
  "type": "recipe",
  "data": {
    "title": "Recipe Title",
    "description": "Short description",
    "imageUrl": "URL to image if available",
    "sourceUrl": "Original URL if from web",
    "prepTime": 15,
    "cookTime": 30,
    "servings": 4,
    "ingredients": [
      {"id": "ing-1", "item": "chicken breast", "quantity": 2, "unit": "lbs", "notes": "boneless, skinless"}
    ],
    "instructions": [
      "Step 1 instruction text",
      "Step 2 instruction text"
    ],
    "category": "Main Course",
    "tags": ["Italian", "Quick"],
    "nutrition": {
      "perServing": {
        "calories": 350,
        "protein": 30,
        "carbs": 25,
        "fat": 12,
        "fiber": 4,
        "sugar": 3,
        "sodium": 450
      },
      "source": "ai_estimate",
      "confidence": "Medium",
      "notes": "Estimated based on typical ingredient values"
    }
  }
}
\`\`\`

Categories to use: Main Course, Side Dish, Appetizer, Salad, Soup, Breakfast, Dessert, Beverage, Snack, Other

For ingredient IDs, generate unique IDs like "ing-1", "ing-2", etc.

If the user asks you to modify a recipe (change servings, substitute ingredients, etc.), output the complete updated recipe JSON.

Be conversational and helpful. If information is missing, ask clarifying questions. After extracting a recipe, summarize what you found and ask if the user wants to make any changes before saving.

When estimating nutrition:
- Be conservative and note any assumptions
- Set confidence to "Low" if quantities are vague
- Include notes explaining your estimation approach`;

async function scrapeUrl(url: string): Promise<{ markdown?: string; error?: string }> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    return { error: "Firecrawl not configured" };
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Firecrawl error:", data);
      return { error: data.error || `Failed to scrape: ${response.status}` };
    }

    // Handle nested data structure
    const markdown = data.data?.markdown || data.markdown;
    return { markdown };
  } catch (error) {
    console.error("Scrape error:", error);
    return { error: error instanceof Error ? error.message : "Failed to scrape URL" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, url } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // If a URL is provided, scrape it first
    let scrapedContent = "";
    if (url) {
      console.log("Scraping URL:", url);
      const scrapeResult = await scrapeUrl(url);
      if (scrapeResult.error) {
        // Return error but let AI handle it gracefully
        scrapedContent = `\n\n[SCRAPE ERROR: ${scrapeResult.error}. Please ask the user to paste the recipe content instead.]`;
      } else if (scrapeResult.markdown) {
        scrapedContent = `\n\n[SCRAPED CONTENT FROM ${url}]:\n${scrapeResult.markdown.substring(0, 15000)}`;
      }
    }

    // Prepare messages for AI
    const aiMessages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Append scraped content to the last user message if present
    if (scrapedContent && aiMessages.length > 0) {
      const lastMsg = aiMessages[aiMessages.length - 1];
      if (lastMsg.role === "user") {
        lastMsg.content += scrapedContent;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please check your workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Recipe chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
