import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `You are a nutrition database. Given a food description, return ONLY a JSON object with these fields:
- name: Short food name (e.g. "Roti with Ghee", not "2 chapatis with ghee")
- calories_per_100g: Number (kcal per 100g)
- protein_per_100g: Number (grams per 100g)
- carbs_per_100g: Number (grams per 100g)
- fat_per_100g: Number (grams per 100g)
- fiber_per_100g: Number (grams per 100g)
- default_unit: Serving unit name (e.g. "serving", "piece", "bowl", "glass", "cup")
- grams_per_unit: Grams per default serving

Rules:
- Estimate nutrition per 100g, NOT per serving
- For multi-item descriptions (e.g. "2 roti with ghee"), calculate weighted average per 100g
- Use Indian food knowledge (dal, roti, rice, sabzi, paratha, idli, dosa, etc.)
- Be conservative — underestimate slightly rather than overestimate
- Return ONLY the JSON, no explanation, no markdown code blocks`;

interface NutritionResult {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  default_unit: string;
  grams_per_unit: number;
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

async function callGroq(query: string): Promise<NutritionResult> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Groq");
  return JSON.parse(content);
}

async function callGemini(query: string): Promise<NutritionResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUser query: ${query}` }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Empty response from Gemini");
  return JSON.parse(content);
}

async function lookupWithAI(query: string): Promise<NutritionResult> {
  try {
    return await callGroq(query);
  } catch (groqErr) {
    console.error("Groq failed, falling back to Gemini:", groqErr);
    return await callGemini(query);
  }
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Query must be at least 2 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Check for exact match in database
    const { data: existingExact } = await supabase
      .from("foods")
      .select("*, units:food_units(*)")
      .ilike("name", query.trim())
      .eq("is_active", true)
      .single();

    if (existingExact) {
      return new Response(
        JSON.stringify({ food: existingExact, source: "database" }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Step 2: Call AI for nutrition data
    const nutrition = await lookupWithAI(query.trim());

    // Step 3: Fuzzy duplicate check
    const { data: allFoods } = await supabase
      .from("foods")
      .select("id, name")
      .eq("is_active", true);

    if (allFoods) {
      const normalizedName = nutrition.name.toLowerCase().trim();
      for (const food of allFoods) {
        const existingName = food.name.toLowerCase().trim();
        if (normalizedName === existingName) {
          // Exact match after AI normalization — fetch full food with units
          const { data: fullFood } = await supabase
            .from("foods")
            .select("*, units:food_units(*)")
            .eq("id", food.id)
            .single();
          return new Response(
            JSON.stringify({ food: fullFood, source: "database" }),
            { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
          );
        }
        if (levenshtein(normalizedName, existingName) <= 2) {
          const { data: fullFood } = await supabase
            .from("foods")
            .select("*, units:food_units(*)")
            .eq("id", food.id)
            .single();
          return new Response(
            JSON.stringify({ food: fullFood, source: "database_similar" }),
            { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
          );
        }
      }
    }

    // Step 4: Insert new food (foods table has no fiber_per_100g column)
    const { data: newFood, error: insertErr } = await supabase
      .from("foods")
      .insert({
        name: nutrition.name,
        calories_per_100g: nutrition.calories_per_100g,
        protein_per_100g: nutrition.protein_per_100g,
        carbs_per_100g: nutrition.carbs_per_100g,
        fat_per_100g: nutrition.fat_per_100g,
        category: "AI Lookup",
        is_active: true,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert food error:", insertErr);
      throw new Error(`Failed to save food: ${insertErr.message}`);
    }

    // Step 5: Insert default serving unit
    const { error: unitErr } = await supabase.from("food_units").insert({
      food_id: newFood.id,
      name: nutrition.default_unit || "serving",
      grams_per_unit: nutrition.grams_per_unit || 100,
      is_default: true,
      display_order: 0,
    });

    if (unitErr) {
      console.error("Insert unit error:", unitErr);
      // Non-fatal — food exists without a unit
    }

    // Step 6: Fetch full food with units
    const { data: fullFood } = await supabase
      .from("foods")
      .select("*, units:food_units(*)")
      .eq("id", newFood.id)
      .single();

    return new Response(
      JSON.stringify({ food: fullFood, source: "ai_lookup" }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    console.error("lookup-food error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Lookup failed" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
