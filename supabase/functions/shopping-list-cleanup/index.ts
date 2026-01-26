import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

const SYSTEM_PROMPT = `You are a smart shopping list assistant. Your job is to clean up and consolidate shopping lists to make them practical for grocery shopping.

Given a list of ingredients with quantities, you should:

1. **Combine quantities for the same item** - If there are multiple entries that are essentially the same ingredient, combine their quantities (e.g., "50g butter" + "30g butter" = "80g butter")

2. **Convert mixed units to practical forms** - When items have different unit types, convert to the most practical (e.g., "2 cups flour" + "100g flour" should become a single weight or volume)

3. **Group similar generic ingredients** - Items like "vegetable oil", "cooking oil", "oil for frying" can be combined as "neutral oil". But keep specialty items separate (olive oil, sesame oil, coconut oil should stay distinct)

4. **Flag issues** - Note any nonsensical combinations (like "1 tbsp bacon" which doesn't make sense)

5. **Suggest practical quantities** - Round to practical shopping amounts (e.g., 127g becomes 130g or 150g)

Respond with a JSON object:
\`\`\`json
{
  "items": [
    {
      "id": "unique-id",
      "ingredient": "Butter",
      "quantity": "150g",
      "category": "Dairy",
      "originalIngredients": ["butter", "unsalted butter"],
      "notes": "Combined from 2 recipes"
    }
  ],
  "changes": [
    "Combined 50g + 30g + 70g butter into 150g",
    "Converted 2 cups flour + 100g flour into 350g flour",
    "Grouped vegetable oil and cooking oil as neutral oil"
  ]
}
\`\`\`

Keep the response concise. Only include items that need changes in the "changes" array.
If an item doesn't need any changes, still include it in "items" but without notes.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    // Format items for the prompt
    const itemsList = items
      .map(item => `- ${item.quantity} ${item.ingredient} (${item.category})`)
      .join("\n");

    const userPrompt = `Please clean up and consolidate this shopping list:\n\n${itemsList}`;

    // Call Google Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SYSTEM_PROMPT + "\n\n" + userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          }
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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from the response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      // Try to parse the whole content as JSON
      try {
        const parsed = JSON.parse(content);
        return new Response(
          JSON.stringify(parsed),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({
            error: "Could not parse AI response",
            raw: content.substring(0, 500)
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const cleanupResult = JSON.parse(jsonMatch[1]) as CleanupResponse;

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
