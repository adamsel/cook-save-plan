import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

interface ShoppingItem {
  id: string;
  ingredient: string;
  quantity: string;
  category: string;
}

interface CleanupRequest {
  items: ShoppingItem[];
}

interface CleanedItem {
  id: string;
  ingredient: string;
  quantity: string;
  category: string;
  originalIngredients?: string[];
  notes?: string;
}

interface CleanupResponse {
  items: CleanedItem[];
  changes: string[];
}

const SYSTEM_PROMPT = `You consolidate shopping lists. Combine duplicates, convert units, round quantities.

IMPORTANT: Respond with ONLY a valid JSON object, no markdown, no code blocks, no explanation. Just the raw JSON.

Output format:
{"items":[{"id":"string","ingredient":"Name","quantity":"amount","category":"Category"}],"changes":["change1"]}

Rules:
- Combine same ingredients (e.g., 50g+30g butter = 80g butter)
- Keep items minimal - only add "originalIngredients" and "notes" if items were actually merged
- Keep "changes" array short - only list actual consolidations made
- Output valid JSON only`;

const BATCH_SIZE = 25;

async function processItemBatch(
  items: ShoppingItem[],
  apiKey: string
): Promise<CleanupResponse> {
  const itemsList = items
    .map(item => `- ${item.quantity} ${item.ingredient} (${item.category})`)
    .join("\n");

  const userPrompt = `Please clean up and consolidate this shopping list:\n\n${itemsList}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        }
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`AI API error: ${response.status}`, errorBody);
    throw new Error(`AI API error: ${response.status} - ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!content) {
    // Return original items if no response
    return {
      items: items.map(item => ({
        id: item.id,
        ingredient: item.ingredient,
        quantity: item.quantity,
        category: item.category,
      })),
      changes: [],
    };
  }

  // Try to parse JSON
  try {
    // First try direct parse
    return JSON.parse(content) as CleanupResponse;
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
          return JSON.parse(content.substring(firstBrace, endIdx + 1)) as CleanupResponse;
        } catch {
          // Fall through to return original
        }
      }
    }
    // Return original items if parsing fails
    return {
      items: items.map(item => ({
        id: item.id,
        ingredient: item.ingredient,
        quantity: item.quantity,
        category: item.category,
      })),
      changes: [],
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting - AI functions are expensive, limit strictly
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.AI_FUNCTION);
  if (!rateLimitResult.allowed) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const { items } = (await req.json()) as CleanupRequest;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit items to prevent abuse
    if (items.length > 100) {
      return new Response(
        JSON.stringify({ error: "Too many items. Maximum 100 allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      console.error("GOOGLE_AI_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ error: "AI service not configured. Please set GOOGLE_AI_API_KEY in Supabase Edge Function environment variables." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process in batches if list is large
    console.log(`Processing ${items.length} items in batches of ${BATCH_SIZE}`);

    const allCleanedItems: CleanedItem[] = [];
    const allChanges: string[] = [];

    // Split items into batches
    const batches: ShoppingItem[][] = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    console.log(`Created ${batches.length} batches`);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} items`);

      try {
        const result = await processItemBatch(batch, GOOGLE_AI_API_KEY);
        allCleanedItems.push(...result.items);
        allChanges.push(...result.changes);
      } catch (e) {
        console.error(`Batch ${i + 1} failed:`, e);
        // On batch failure, add original items
        allCleanedItems.push(...batch.map(item => ({
          id: item.id,
          ingredient: item.ingredient,
          quantity: item.quantity,
          category: item.category,
        })));
      }
    }

    // If we have multiple batches, do a final consolidation pass on items that might span batches
    // Group by ingredient name and combine if needed
    if (batches.length > 1) {
      console.log("Running final consolidation pass across batches");
      // For now, just return the combined results - a full cross-batch consolidation would need another AI call
      // which could cause similar issues. Users can run cleanup again if needed.
    }

    const cleanupResult: CleanupResponse = {
      items: allCleanedItems,
      changes: allChanges.length > 0 ? allChanges : ["No consolidations needed"],
    };

    return new Response(
      JSON.stringify(cleanupResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Shopping list cleanup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
