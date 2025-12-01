import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactName, contactNotes, linkedinUrl, lastContacted, tone, length } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from contact info
    let context = `You are helping write a friendly text message to ${contactName}.`;
    
    if (contactNotes) {
      context += ` Here are some notes about them: ${contactNotes}`;
    }

    if (linkedinUrl) {
      context += ` They have a LinkedIn profile at ${linkedinUrl}. If you can infer anything about their profession or interests from this, you can reference it naturally.`;
    }
    
    if (lastContacted) {
      const lastDate = new Date(lastContacted);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 0) {
        context += ` It's been about ${daysSince} days since you last messaged them.`;
      }
    }

    // Build tone and length instructions
    const toneMap: Record<string, string> = {
      casual: "casual and relaxed, like texting a friend",
      friendly: "warm and friendly, showing genuine interest",
      professional: "polite and professional, but still personable",
    };

    const lengthMap: Record<string, string> = {
      short: "Keep it brief - 1-2 sentences max.",
      medium: "Keep it moderate - 2-3 sentences.",
      long: "Make it a bit longer - 3-4 sentences with more detail.",
    };

    const toneInstruction = toneMap[tone] || toneMap.friendly;
    const lengthInstruction = lengthMap[length] || lengthMap.medium;

    const systemPrompt = `${context}

Write a text message that is ${toneInstruction}.
${lengthInstruction}

Rules:
- Do NOT use any greeting like "Hey" or "Hi" at the start - just jump right into the message
- Do NOT use the person's name in the message
- Make it feel natural and genuine, not like a template
- If there are notes about the person, reference something specific from them
- Don't be overly enthusiastic with exclamation marks
- Write ONLY the message text, nothing else`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate a text message now." },
        ],
        max_tokens: 200,
        temperature: 0.8,
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
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate message");
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate message error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
