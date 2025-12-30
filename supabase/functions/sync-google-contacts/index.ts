import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleContact {
  resourceName: string;
  etag: string;
  names?: Array<{ displayName?: string; givenName?: string; familyName?: string }>;
  phoneNumbers?: Array<{ value: string; type?: string }>;
  emailAddresses?: Array<{ value: string; type?: string }>;
  photos?: Array<{ url: string }>;
  memberships?: Array<{ contactGroupMembership?: { contactGroupResourceName: string } }>;
}

interface SyncRequest {
  userId: string;
  accessToken: string;
  syncToken?: string;
}

// Input validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, accessToken, syncToken } = await req.json() as SyncRequest;

    // Validate required parameters
    if (!accessToken || typeof accessToken !== 'string') {
      console.error('[sync-google-contacts] Missing or invalid accessToken');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid accessToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId || !isValidUUID(userId)) {
      console.error('[sync-google-contacts] Missing or invalid userId');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-google-contacts] Starting sync for user: ${userId}`);

    // Fetch contacts from Google People API
    let url = 'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,memberships&pageSize=1000';
    if (syncToken) {
      url += `&syncToken=${syncToken}`;
    } else {
      url += '&requestSyncToken=true';
    }

    const googleResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error(`[sync-google-contacts] Google API error: ${errorText}`);
      
      // Check if token is expired
      if (googleResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Google token expired', code: 'TOKEN_EXPIRED' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Google contacts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleData = await googleResponse.json();
    const connections: GoogleContact[] = googleData.connections || [];
    const nextSyncToken = googleData.nextSyncToken;

    console.log(`[sync-google-contacts] Fetched ${connections.length} contacts from Google`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let syncedCount = 0;
    const now = new Date().toISOString();

    for (const contact of connections) {
      const googleId = contact.resourceName; // e.g., "people/c1234567890"
      const etag = contact.etag;
      
      const displayName = contact.names?.[0]?.displayName || 'Unknown';
      const givenName = contact.names?.[0]?.givenName || null;
      const familyName = contact.names?.[0]?.familyName || null;
      
      // Format phones as JSON array
      const phones = contact.phoneNumbers?.map(p => ({
        value: p.value,
        type: p.type || 'other',
      })) || [];
      
      // Format emails as JSON array  
      const emails = contact.emailAddresses?.map(e => ({
        value: e.value,
        type: e.type || 'other',
      })) || [];

      // Skip contacts without meaningful data
      if (displayName === 'Unknown' && phones.length === 0 && emails.length === 0) {
        continue;
      }

      try {
        // Check if we already have a link for this Google contact
        const { data: existingLink } = await supabase
          .from('contact_links')
          .select('id, app_contact_id, external_etag')
          .eq('external_id', googleId)
          .eq('source', 'google')
          .single();

        if (existingLink) {
          // Update existing contact if etag changed
          if (existingLink.external_etag !== etag) {
            // Update app_contact
            await supabase
              .from('app_contacts')
              .update({
                display_name: displayName,
                given_name: givenName,
                family_name: familyName,
                phones: phones,
                emails: emails,
                updated_at: now,
              })
              .eq('id', existingLink.app_contact_id);

            // Update contact_link etag
            await supabase
              .from('contact_links')
              .update({
                external_etag: etag,
                last_pulled_at: now,
                updated_at: now,
              })
              .eq('id', existingLink.id);

            console.log(`[sync-google-contacts] Updated contact: ${displayName}`);
          }
        } else {
          // Create new app_contact
          const { data: newContact, error: insertError } = await supabase
            .from('app_contacts')
            .insert({
              user_id: userId,
              display_name: displayName,
              given_name: givenName,
              family_name: familyName,
              phones: phones,
              emails: emails,
              source_preference: 'google',
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`[sync-google-contacts] Error inserting contact: ${insertError.message}`);
            continue;
          }

          // Create contact_link
          const { error: linkError } = await supabase
            .from('contact_links')
            .insert({
              app_contact_id: newContact.id,
              source: 'google',
              external_id: googleId,
              external_etag: etag,
              last_pulled_at: now,
            });

          if (linkError) {
            console.error(`[sync-google-contacts] Error creating link: ${linkError.message}`);
            continue;
          }

          console.log(`[sync-google-contacts] Created contact: ${displayName}`);
        }

        syncedCount++;
      } catch (e) {
        console.error(`[sync-google-contacts] Error processing contact ${displayName}:`, e);
      }
    }

    // Update user_integrations with new sync token and last sync time
    await supabase
      .from('user_integrations')
      .update({
        google_sync_token: nextSyncToken,
        last_sync_google: now,
        updated_at: now,
      })
      .eq('user_id', userId);

    console.log(`[sync-google-contacts] Sync complete. Synced ${syncedCount} contacts.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        syncedCount,
        nextSyncToken,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-google-contacts] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
