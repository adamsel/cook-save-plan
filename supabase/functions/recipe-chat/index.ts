import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
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
4. Extract recipes from photos — cookbook pages, handwritten cards, Instagram screenshots, etc. Read all visible recipe text and output the structured JSON
5. Estimate nutrition information based on ingredients

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
    "category": "Dinner",
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

Categories to use: Dinner, Lunch, Side Dish, Appetizer, Salad, Soup, Dessert, Beverage, Other

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

  // Rate limiting - AI functions are expensive
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.AI_FUNCTION);
  if (!rateLimitResult.allowed) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    // Authenticate and check premium subscription
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          console.log("Authenticated request from user:", user.id);

          // Check premium subscription
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("subscription_tier")
            .eq("user_id", user.id)
            .single();

          if (profile?.subscription_tier !== "premium") {
            return new Response(
              JSON.stringify({ error: "Premium subscription required for AI recipe chat." }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (authError) {
        console.log("Auth check failed, proceeding anyway:", authError);
      }
    }

    const body = await req.json();
    const { messages, url, image } = body;

    // Validate image if provided
    if (image) {
      if (!image.base64 || typeof image.base64 !== 'string') {
        return new Response(
          JSON.stringify({ error: "Invalid image: base64 data required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimeTypes.includes(image.mimeType)) {
        return new Response(
          JSON.stringify({ error: "Invalid image type: must be JPEG, PNG, or WebP" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // ~4MB base64 ≈ ~3MB raw image
      if (image.base64.length > 4 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Image too large: maximum 3MB" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid messages: must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messages.length > 50) {
      return new Response(
        JSON.stringify({ error: "Too many messages: maximum 50 allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        return new Response(
          JSON.stringify({ error: "Invalid message role: must be 'user', 'assistant', or 'system'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof msg.content !== 'string') {
        return new Response(
          JSON.stringify({ error: "Invalid message content: must be a string" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (msg.content.length > 10000) {
        return new Response(
          JSON.stringify({ error: "Message too long: maximum 10000 characters per message" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate URL if provided
    if (url !== undefined && url !== null && url !== '') {
      if (typeof url !== 'string') {
        return new Response(
          JSON.stringify({ error: "Invalid URL: must be a string" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      try {
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          return new Response(
            JSON.stringify({ error: "Invalid URL: must use http or https protocol" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // SSRF protection: block internal and cloud metadata addresses
        const hostname = urlObj.hostname.toLowerCase();
        const blockedHosts = [
          'localhost',
          '127.0.0.1',
          '0.0.0.0',
          '169.254.169.254',
          'metadata.google.internal',
          'metadata',
          '::1',
          '[::1]',
        ];
        
        if (blockedHosts.includes(hostname)) {
          return new Response(
            JSON.stringify({ error: "Invalid URL: internal addresses not allowed" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Block private IP ranges
        if (
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
          hostname.startsWith('169.254.')
        ) {
          return new Response(
            JSON.stringify({ error: "Invalid URL: private IP addresses not allowed" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid URL format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
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

    // Build conversation for Gemini
    const conversationParts: string[] = [SYSTEM_PROMPT, ""];
    for (const msg of messages) {
      if (msg.role === "user") {
        conversationParts.push(`User: ${msg.content}`);
      } else if (msg.role === "assistant") {
        conversationParts.push(`Assistant: ${msg.content}`);
      }
    }

    // Append scraped content to the conversation
    if (scrapedContent) {
      conversationParts.push(scrapedContent);
    }

    // If image provided, add extraction instructions
    if (image) {
      conversationParts.push("\n[The user has uploaded an image. Extract all recipe information visible in the image including title, ingredients with quantities, and instructions. If the image is a screenshot of social media, extract the recipe from the caption/text. Output the complete recipe JSON.]");
    }

    conversationParts.push("\nAssistant:");

    // Build request parts — text-only or multimodal
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: conversationParts.join("\n") },
    ];

    if (image) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.base64,
        },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("Google AI error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Format as SSE for streaming compatibility with the frontend
    const encoder = new TextEncoder();
    const sseData = `data: ${JSON.stringify({
      choices: [{
        delta: { content: aiResponse },
        finish_reason: "stop"
      }]
    })}\n\ndata: [DONE]\n\n`;

    return new Response(encoder.encode(sseData), {
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
