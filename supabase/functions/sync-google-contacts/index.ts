import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- ENV ----
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("Missing Supabase env vars", {
        hasUrl: !!supabaseUrl,
        hasAnon: !!supabaseAnonKey,
        hasService: !!supabaseServiceKey,
      });
      return new Response(JSON.stringify({ error: "Server misconfigured (missing env vars)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- AUTH: validate Supabase session from Authorization header ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser();
    const user = authData?.user;

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // ---- INPUT ----
    const body = await req.json().catch(() => ({}));
    const accessToken = body?.accessToken;

    if (!accessToken || typeof accessToken !== "string") {
      console.error("Missing or invalid accessToken");
      return new Response(JSON.stringify({ error: "Missing or invalid accessToken" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching Google Contacts for user:", userId);

    // ---- GOOGLE PEOPLE API ----
    const googleResponse = await fetch(
      "https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses,photos,memberships&pageSize=1000",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error("Google API error:", googleResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to fetch Google contacts", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const googleData = await googleResponse.json();
    const connections = googleData.connections || [];
    console.log(`Found ${connections.length} Google contacts`);

    // ---- DB CLIENT (service role for writes) ----
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- EXISTING LINKS (scoped to this user!) ----
    const { data: existingLinks, error: existingLinksError } = await supabase
      .from("contact_links")
      .select("external_id, app_contact_id")
      .eq("source", "google")
      .eq("user_id", userId);

    if (existingLinksError) {
      console.error("Error fetching existing contact links:", existingLinksError);
      return new Response(JSON.stringify({ error: "Failed to fetch existing contact links" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingLinkMap = new Map((existingLinks || []).map((link: any) => [link.external_id, link.app_contact_id]));

    let syncedCount = 0;
    let updatedCount = 0;

    // ---- PROCESS CONTACTS ----
    for (const person of connections) {
      const displayName = person.names?.[0]?.displayName;
      if (!displayName) continue;

      const googleId = person.resourceName;
      const givenName = person.names?.[0]?.givenName || null;
      const familyName = person.names?.[0]?.familyName || null;

      const phones =
        person.phoneNumbers?.map((p: any) => ({
          value: p.value,
          type: p.type || "other",
        })) || null;

      const emails =
        person.emailAddresses?.map((e: any) => ({
          value: e.value,
          type: e.type || "other",
        })) || null;

      // membership label (best-effort)
      let label: string | null = null;
      if (person.memberships) {
        for (const membership of person.memberships) {
          const groupName = membership.contactGroupMembership?.contactGroupResourceName;
          if (groupName) {
            const labelPart = groupName.split("/").pop();
            if (labelPart && labelPart !== "myContacts") {
              label = labelPart;
              break;
            }
          }
        }
      }

      const existingAppContactId = existingLinkMap.get(googleId);

      if (existingAppContactId) {
        // Update existing contact
        const { error: updateError } = await supabase
          .from("app_contacts")
          .update({
            display_name: displayName,
            given_name: givenName,
            family_name: familyName,
            phones,
            emails,
            label,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAppContactId)
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error updating contact:", updateError);
        } else {
          updatedCount++;
        }
      } else {
        // Create new contact
        const { data: newContact, error: insertError } = await supabase
          .from("app_contacts")
          .insert({
            user_id: userId,
            display_name: displayName,
            given_name: givenName,
            family_name: familyName,
            phones,
            emails,
            label,
            source_preference: "google",
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Error inserting contact:", insertError);
          continue;
        }

        // Create contact link (NOW includes user_id)
        const { error: linkError } = await supabase.from("contact_links").insert({
          user_id: userId,
          app_contact_id: newContact.id,
          external_id: googleId,
          source: "google",
          sync_enabled: true,
          last_pulled_at: new Date().toISOString(),
        });

        if (linkError) {
          console.error("Error creating contact link:", linkError);
        } else {
          syncedCount++;
        }
      }
    }

    console.log(`Successfully synced ${syncedCount} new contacts, updated ${updatedCount} existing`);

    return new Response(JSON.stringify({ success: true, synced: syncedCount, updated: updatedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
