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

    let syncedCount = 0;

    // Process each contact
    for (const person of connections) {
      const name = person.names?.[0]?.displayName;
      if (!name) continue; // Skip contacts without names

      const googleId = person.resourceName;
      const phone = person.phoneNumbers?.[0]?.value || null;
      const email = person.emailAddresses?.[0]?.value || null;
      const photo = person.photos?.[0]?.url || null;

      // Extract labels from memberships (contact groups)
      const labels: string[] = [];
      if (person.memberships) {
        for (const membership of person.memberships) {
          if (membership.contactGroupMembership?.contactGroupResourceName) {
            const groupName = membership.contactGroupMembership.contactGroupResourceName;
            // Extract the last part of the resource name as label
            const labelPart = groupName.split('/').pop();
            if (labelPart && labelPart !== 'myContacts') {
              labels.push(labelPart);
            }
          }
        }
      }

      // Upsert contact (update if exists, insert if new)
      const { error } = await supabase
        .from('contacts')
        .upsert(
          {
            user_id: userId,
            google_id: googleId,
            name,
            phone,
            email,
            photo,
            labels,
          },
          {
            onConflict: 'user_id,google_id',
          }
        );

      if (error) {
        console.error('Error upserting contact:', error);
      } else {
        syncedCount++;
      }
    }

    console.log(`Successfully synced ${syncedCount} contacts`);

    return new Response(
      JSON.stringify({ success: true, synced: syncedCount }),
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
