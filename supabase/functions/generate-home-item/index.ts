import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ITEM_PROMPTS: Record<string, string> = {
  "scrying-mirror": "ornate magical mirror with swirling mist, mounted on a stone wall",
  "simple-scrying-glass": "small enchanted crystal ball on a wooden stand",
  "memory-crystal": "glowing purple crystal on a pedestal, storing magical memories",
  "music-box": "ornate wooden music box with arcane runes, lid slightly open",
  "cooking-fire": "eternal magical cooking flame in a stone hearth",
  "preservation-box": "enchanted wooden chest with frost runes for preserving food",
  "arcane-tome": "large ancient spellbook on a lectern, pages glowing faintly",
  "frost-chest": "ice-encrusted storage chest radiating cold mist",
  "candles": "cluster of melting candles in a brass holder on a shelf",
  "blanket": "thick wool blanket draped over a simple wooden bed",
  "furniture": "basic medieval wooden chair and small table",
  "glow-orb": "floating magical orb emitting warm golden light",
  "warmth-stone": "enchanted hearthstone glowing with inner warmth on the floor",
  "dagger": "ornate dagger mounted on a wall bracket",
  "sword": "longsword displayed on a wall-mounted rack",
  "shield": "round wooden shield with iron boss hanging on the wall",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const itemId = body.itemId as string;

    if (!itemId || !ITEM_PROMPTS[itemId]) {
      return new Response(JSON.stringify({ error: "Invalid itemId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const itemDescription = ITEM_PROMPTS[itemId];
    const prompt = `Medieval woodcut whimsical illustration of ${itemDescription} as placed in a medieval room, black ink on aged parchment, detailed line work, fantasy RPG item icon, 1:1 square, 512x512`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Add credits to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Image generation failed. Please try again." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ imageUrl, itemId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-home-item error:", e);
    return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
