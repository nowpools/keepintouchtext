import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetch LinkedIn profile content using Firecrawl
async function fetchLinkedInContent(linkedinUrl: string): Promise<string | null> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    console.log("FIRECRAWL_API_KEY not configured, skipping LinkedIn scrape");
    return null;
  }

  try {
    console.log("Scraping LinkedIn URL:", linkedinUrl);
    
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: linkedinUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000, // Wait for dynamic content to load
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown;
    
    if (markdown) {
      // Limit content to avoid token limits - extract most relevant parts
      const truncated = markdown.substring(0, 2000);
      console.log("LinkedIn content fetched successfully, length:", truncated.length);
      return truncated;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching LinkedIn content:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactName, contactNotes, linkedinUrl, conversationContext, lastContacted, tone, length } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from contact info
    let context = "";
    
    // Fetch LinkedIn content using Firecrawl if URL provided
    let linkedinContent: string | null = null;
    if (linkedinUrl) {
      linkedinContent = await fetchLinkedInContent(linkedinUrl);
    }
    
    // Build rich context
    const contextParts: string[] = [];
    
    if (conversationContext && conversationContext.trim()) {
      contextParts.push(`Previous conversation snippets and context:\n"${conversationContext}"`);
    }
    
    if (contactNotes && contactNotes.trim()) {
      contextParts.push(`Personal notes about ${contactName}: "${contactNotes}"`);
    }
    
    if (linkedinContent) {
      contextParts.push(`Their LinkedIn profile content:\n${linkedinContent}`);
    } else if (linkedinUrl) {
      contextParts.push(`They have a LinkedIn profile at ${linkedinUrl}`);
    }
    
    if (lastContacted) {
      const lastDate = new Date(lastContacted);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 0) {
        if (daysSince === 1) {
          contextParts.push("You texted them yesterday.");
        } else if (daysSince < 7) {
          contextParts.push(`You last texted them ${daysSince} days ago.`);
        } else if (daysSince < 30) {
          const weeks = Math.floor(daysSince / 7);
          contextParts.push(`It's been about ${weeks} week${weeks > 1 ? 's' : ''} since you last texted.`);
        } else {
          const months = Math.floor(daysSince / 30);
          contextParts.push(`It's been ${months} month${months > 1 ? 's' : ''} since you last reached out.`);
        }
      }
    }

    if (contextParts.length > 0) {
      context = `\n\nContext about this person:\n${contextParts.join("\n\n")}`;
    }

    // Build tone and length instructions
    const toneMap: Record<string, string> = {
      casual: "super casual and chill, like you're texting your buddy. Use lowercase, maybe skip some punctuation, keep it real",
      friendly: "warm and genuine, like catching up with a good friend you haven't seen in a bit",
      professional: "friendly but professional, the kind of text you'd send to a respected colleague",
    };

    const lengthMap: Record<string, string> = {
      short: "Keep it super short - just 1 sentence, maybe 2 max. Get to the point.",
      medium: "Keep it natural length - 2-3 sentences feels right.",
      long: "A bit more detail is fine - 3-4 sentences to really connect.",
    };

    const toneInstruction = toneMap[tone] || toneMap.friendly;
    const lengthInstruction = lengthMap[length] || lengthMap.medium;

    const systemPrompt = `You write text messages for someone reaching out to people they know. Your job is to write ONE text message that sounds completely natural and human.
${context}

Style: ${toneInstruction}
Length: ${lengthInstruction}

Critical rules:
- NEVER start with "Hey" or "Hi" or any greeting - just dive right in
- NEVER use their name in the message
- NO emojis unless the tone is casual
- Sound like a real person, not a bot or assistant
- If there are notes about them, weave in something specific naturally (don't force it)
- If there's conversation context, reference topics or things mentioned naturally to show you remember previous interactions
- If there's a LinkedIn profile mentioned, you can subtly acknowledge their professional world but don't be weird about it
- Don't be overly enthusiastic or use too many exclamation marks
- Match how real people actually text - contractions, natural flow
- Be curious and genuine - ask about something real
- If little context is available, keep it simple and genuine - a light check-in works great
- Output ONLY the message text, nothing else

Examples of good messages:
- "Been thinking about that project you mentioned - how's it going?"
- "saw your post about the conference, looked awesome. we should grab coffee and you can tell me about it"
- "Hope the new role is treating you well! Would love to catch up sometime"
- "Random but I just saw something that reminded me of our chat about startups. Miss those convos"
- "how've you been? feels like it's been forever"
- "just wanted to check in - hope things are going well on your end"`;

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
          { role: "user", content: "Write a text message now." },
        ],
        max_tokens: 200,
        temperature: 0.9,
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
