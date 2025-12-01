import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchLinkedInContent(linkedinUrl: string): Promise<string | null> {
  try {
    console.log("Fetching LinkedIn content from:", linkedinUrl);
    
    // Fetch the LinkedIn page
    const response = await fetch(linkedinUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      console.log("LinkedIn fetch failed:", response.status);
      return null;
    }

    const html = await response.text();
    
    // Extract useful content from the HTML
    const extracted: string[] = [];
    
    // Try to extract the title (usually contains name and headline)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      const title = titleMatch[1].replace(/\s*\|\s*LinkedIn.*$/i, "").trim();
      if (title && !title.includes("Sign Up") && !title.includes("Log In")) {
        extracted.push(`Profile headline: ${title}`);
      }
    }

    // Extract meta description (often contains bio/summary)
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch) {
      const desc = descMatch[1].trim();
      if (desc && desc.length > 20 && !desc.includes("LinkedIn")) {
        extracted.push(`Bio: ${desc}`);
      }
    }

    // Extract og:description (alternative bio source)
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    if (ogDescMatch && !extracted.some(e => e.includes(ogDescMatch[1]))) {
      const ogDesc = ogDescMatch[1].trim();
      if (ogDesc && ogDesc.length > 20) {
        extracted.push(`Summary: ${ogDesc}`);
      }
    }

    // Try to find job title patterns
    const jobPatterns = [
      /(?:currently|working as|position)[:\s]+([^<\n]+)/gi,
      /(?:founder|ceo|director|manager|engineer|developer|designer|consultant|analyst)[^<\n]{0,50}/gi,
    ];
    
    for (const pattern of jobPatterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        const unique = [...new Set(matches.map(m => m.trim().slice(0, 100)))];
        if (unique.length > 0 && unique[0].length > 5) {
          extracted.push(`Role info: ${unique.slice(0, 2).join(", ")}`);
          break;
        }
      }
    }

    if (extracted.length === 0) {
      console.log("No useful content extracted from LinkedIn");
      return null;
    }

    const content = extracted.join("\n");
    console.log("Extracted LinkedIn content:", content.slice(0, 200));
    return content;
  } catch (error) {
    console.error("Error fetching LinkedIn:", error);
    return null;
  }
}

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
    let context = "";
    let linkedinContent: string | null = null;
    
    // Fetch LinkedIn content if URL provided
    if (linkedinUrl) {
      linkedinContent = await fetchLinkedInContent(linkedinUrl);
    }
    
    // Build rich context
    const contextParts: string[] = [];
    
    if (contactNotes && contactNotes.trim()) {
      contextParts.push(`Personal notes about ${contactName}: "${contactNotes}"`);
    }
    
    if (linkedinContent) {
      contextParts.push(`LinkedIn profile info for ${contactName}:\n${linkedinContent}`);
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
- If there's LinkedIn info, you can reference their work/interests naturally but don't be creepy about it
- Don't be overly enthusiastic or use too many exclamation marks
- Match how real people actually text - contractions, natural flow
- Output ONLY the message text, nothing else

Examples of good messages:
- "Been thinking about that project you mentioned - how's it going?"
- "saw your post about the conference, looked awesome. we should grab coffee and you can tell me about it"
- "Hope the new role is treating you well! Would love to catch up sometime"
- "Random but I just saw something that reminded me of our chat about startups. Miss those convos"`;

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
