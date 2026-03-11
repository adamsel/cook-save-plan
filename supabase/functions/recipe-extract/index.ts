import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// SSRF protection (from recipe-chat)
function isBlockedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return "Must use http or https";
    }
    const hostname = urlObj.hostname.toLowerCase();
    const blocked = [
      "localhost", "127.0.0.1", "0.0.0.0",
      "169.254.169.254", "metadata.google.internal", "metadata",
      "::1", "[::1]",
    ];
    if (blocked.includes(hostname)) return "Internal addresses not allowed";
    if (
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      hostname.startsWith("169.254.") ||
      hostname.endsWith(".local")
    ) {
      return "Private addresses not allowed";
    }
    return null;
  } catch {
    return "Invalid URL format";
  }
}

// Firecrawl scraping (from recipe-chat)
async function scrapeUrl(url: string): Promise<{ markdown?: string; error?: string }> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return { error: "Firecrawl not configured" };

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
      return { error: data.error || `Scrape failed: ${response.status}` };
    }

    const markdown = data.data?.markdown || data.markdown;
    return { markdown };
  } catch (error) {
    console.error("Scrape error:", error);
    return { error: error instanceof Error ? error.message : "Scrape failed" };
  }
}

const EXTRACTION_PROMPT = `You are a recipe data extractor. Given the scraped content of a recipe webpage, extract the recipe into structured JSON.

Return ONLY a JSON object (no markdown, no code blocks, no extra text) with this exact structure:

{
  "title": "Recipe Title",
  "description": "Short 1-2 sentence description",
  "imageUrl": "URL to the main recipe image if found in the content",
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "ingredients": [
    {"id": "ing-1", "item": "chicken breast", "quantity": 2, "unit": "lbs", "notes": "boneless, skinless"}
  ],
  "instructions": [
    "Step 1 text",
    "Step 2 text"
  ],
  "category": "Dinner",
  "tags": ["Quick", "Healthy"],
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
    "notes": "Estimated from ingredients"
  }
}

Rules:
- Categories: Dinner, Lunch, Side Dish, Appetizer, Salad, Soup, Dessert, Beverage, Breakfast, Snack, Other
- For ingredient IDs use "ing-1", "ing-2", etc.
- quantity should be a number or null if not specified
- unit should be lowercase (cups, tbsp, tsp, lbs, oz, g, ml, etc.) or empty string
- prepTime and cookTime in minutes (number or null)
- Always estimate nutrition based on ingredients
- Return ONLY the JSON object, nothing else`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.AI_FUNCTION);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return jsonResponse({ error: "URL is required" }, 400);
    }

    const blockReason = isBlockedUrl(url);
    if (blockReason) {
      return jsonResponse({ error: blockReason }, 400);
    }

    // Step 1: Scrape URL to markdown via Firecrawl
    console.log("Scraping:", url);
    const scrapeResult = await scrapeUrl(url);
    if (scrapeResult.error || !scrapeResult.markdown) {
      return jsonResponse({
        error: scrapeResult.error || "Could not scrape page",
      }, 502);
    }

    // Step 2: Extract recipe via Gemini
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      return jsonResponse({ error: "AI service not configured" }, 500);
    }

    const content = scrapeResult.markdown.substring(0, 15000);

    // gemini-2.0-flash: good quality, 15 RPM / 1500 RPD free tier (or 2000 RPM with billing)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`;
    const geminiBody = JSON.stringify({
      contents: [{
        parts: [{
          text: `${EXTRACTION_PROMPT}\n\n--- SCRAPED CONTENT FROM ${url} ---\n\n${content}`,
        }],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    // Retry with exponential backoff on Gemini 429 rate limits
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: geminiBody,
      });

      if (response.status !== 429) break;

      if (attempt < 2) {
        const waitMs = (attempt + 1) * 5000; // 5s, 10s
        console.log(`Gemini 429 for ${url}, retrying in ${waitMs}ms (attempt ${attempt + 1}/3)`);
        await new Promise(r => setTimeout(r, waitMs));
      }
    }

    if (!response!.ok) {
      if (response!.status === 429) {
        return jsonResponse({ error: "AI rate limit exceeded after retries" }, 429);
      }
      const text = await response!.text();
      console.error("Gemini error:", response!.status, text);
      return jsonResponse({ error: "AI extraction failed" }, 500);
    }

    const data = await response!.json();

    // Gemini 2.5 Flash may include thinking parts — extract only non-thinking text
    const parts = data.candidates?.[0]?.content?.parts || [];
    const aiText = parts
      .filter((p: { thought?: boolean; text?: string }) => !p.thought && p.text)
      .map((p: { text: string }) => p.text)
      .join("\n") || "";

    // Parse the JSON response — handle code blocks, thinking text, etc.
    let recipe;
    try {
      // Try extracting JSON from code block first
      const codeBlockMatch = aiText.match(/```json?\s*\n?([\s\S]*?)\n?\s*```/i);
      if (codeBlockMatch) {
        recipe = JSON.parse(codeBlockMatch[1].trim());
      } else {
        // Try finding a JSON object directly
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          recipe = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr, "Text:", aiText.substring(0, 500));
      return jsonResponse({ error: "Could not parse recipe from page" }, 500);
    }

    // Ensure sourceUrl is set
    recipe.sourceUrl = recipe.sourceUrl || url;

    return jsonResponse({ recipe });
  } catch (error) {
    console.error("Recipe extract error:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Extraction failed",
    }, 500);
  }
});
