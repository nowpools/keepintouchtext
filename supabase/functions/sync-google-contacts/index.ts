import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const body = await req.json();
    const accessToken = body.accessToken;
    const userId = body.userId;

    // Validate required parameters
    if (!accessToken || typeof accessToken !== 'string') {
      console.error('Missing or invalid accessToken');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid accessToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId || !isValidUUID(userId)) {
      console.error('Missing or invalid userId:', { hasUserId: !!userId, isValid: userId ? isValidUUID(userId) : false });
      return new Response(
        JSON.stringify({ error: 'Missing or invalid userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Google Contacts for user:', userId);

    // Fetch contacts from Google People API
    const googleResponse = await fetch(
      'https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses,photos,memberships&pageSize=1000',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error('Google API error:', googleResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Google contacts', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleData = await googleResponse.json();
    const connections = googleData.connections || [];

    console.log(`Found ${connections.length} Google contacts`);

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch existing contact links for this user to check for duplicates
    const { data: existingLinks } = await supabase
      .from('contact_links')
      .select('external_id, app_contact_id')
      .eq('source', 'google');

    const existingLinkMap = new Map(
      (existingLinks || []).map(link => [link.external_id, link.app_contact_id])
    );

    let syncedCount = 0;
    let updatedCount = 0;

    // Process each contact
    for (const person of connections) {
      const displayName = person.names?.[0]?.displayName;
      if (!displayName) continue; // Skip contacts without names

      const googleId = person.resourceName;
      const givenName = person.names?.[0]?.givenName || null;
      const familyName = person.names?.[0]?.familyName || null;
      
      // Format phones as JSON array
      const phones = person.phoneNumbers?.map((p: any) => ({
        value: p.value,
        type: p.type || 'other'
      })) || null;
      
      // Format emails as JSON array
      const emails = person.emailAddresses?.map((e: any) => ({
        value: e.value,
        type: e.type || 'other'
      })) || null;

      // Extract first label from memberships (contact groups)
      let label: string | null = null;
      if (person.memberships) {
        for (const membership of person.memberships) {
          if (membership.contactGroupMembership?.contactGroupResourceName) {
            const groupName = membership.contactGroupMembership.contactGroupResourceName;
            const labelPart = groupName.split('/').pop();
            if (labelPart && labelPart !== 'myContacts') {
              label = labelPart;
              break;
            }
          }
        }
      }

      // Check if this Google contact already exists
      const existingAppContactId = existingLinkMap.get(googleId);

      if (existingAppContactId) {
        // Update existing contact
        const { error: updateError } = await supabase
          .from('app_contacts')
          .update({
            display_name: displayName,
            given_name: givenName,
            family_name: familyName,
            phones,
            emails,
            label,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAppContactId);

        if (updateError) {
          console.error('Error updating contact:', updateError);
        } else {
          updatedCount++;
        }
      } else {
        // Create new contact
        const { data: newContact, error: insertError } = await supabase
          .from('app_contacts')
          .insert({
            user_id: userId,
            display_name: displayName,
            given_name: givenName,
            family_name: familyName,
            phones,
            emails,
            label,
            source_preference: 'google',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting contact:', insertError);
        } else if (newContact) {
          // Create contact link
          const { error: linkError } = await supabase
            .from('contact_links')
            .insert({
              app_contact_id: newContact.id,
              external_id: googleId,
              source: 'google',
              sync_enabled: true,
              last_pulled_at: new Date().toISOString(),
            });

          if (linkError) {
            console.error('Error creating contact link:', linkError);
          } else {
            syncedCount++;
          }
        }
      }
    }

    console.log(`Successfully synced ${syncedCount} new contacts, updated ${updatedCount} existing`);

    return new Response(
      JSON.stringify({ success: true, synced: syncedCount, updated: updatedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
