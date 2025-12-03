import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateContactRequest {
  accessToken: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, userId, name, phone, email, notes }: CreateContactRequest = await req.json();

    console.log('Creating contact for user:', userId);
    console.log('Contact name:', name);

    if (!accessToken) {
      throw new Error('No access token provided');
    }

    if (!name) {
      throw new Error('Contact name is required');
    }

    // Create contact in Google Contacts
    const googleContact = {
      names: [{ givenName: name }],
      phoneNumbers: phone ? [{ value: phone }] : [],
      emailAddresses: email ? [{ value: email }] : [],
      biographies: notes ? [{ value: notes }] : [],
    };

    console.log('Creating Google Contact:', JSON.stringify(googleContact));

    const googleResponse = await fetch(
      'https://people.googleapis.com/v1/people:createContact',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleContact),
      }
    );

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error('Google API error:', googleResponse.status, errorText);
      throw new Error(`Failed to create Google Contact: ${errorText}`);
    }

    const createdGoogleContact = await googleResponse.json();
    console.log('Google Contact created:', createdGoogleContact.resourceName);

    // Extract Google ID from resource name (format: people/c123456789)
    const googleId = createdGoogleContact.resourceName;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save to local database
    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        google_id: googleId,
        name: name,
        phone: phone || null,
        email: email || null,
        notes: notes || '',
        labels: [],
        cadence: 'monthly',
        last_contacted: null,
        next_due: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save contact: ${insertError.message}`);
    }

    console.log('Contact saved to database:', newContact.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        contact: newContact,
        googleId: googleId,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating contact:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
