import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_NAME_LENGTH = 200;
const MAX_PHONE_LENGTH = 50;
const MAX_EMAIL_LENGTH = 255;
const MAX_NOTES_LENGTH = 5000;

function sanitizeString(str: string | undefined | null, maxLength: number): string {
  if (!str) return '';
  return str.trim().slice(0, maxLength);
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  if (!phone || phone.length > MAX_PHONE_LENGTH) return false;
  // Allow digits, spaces, dashes, parentheses, and plus sign
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(phone);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate and sanitize inputs
    const accessToken = body.accessToken;
    const userId = body.userId;
    const name = sanitizeString(body.name, MAX_NAME_LENGTH);
    const phone = body.phone ? sanitizeString(body.phone, MAX_PHONE_LENGTH) : null;
    const email = body.email ? sanitizeString(body.email, MAX_EMAIL_LENGTH) : null;
    const notes = sanitizeString(body.notes, MAX_NOTES_LENGTH);

    console.log('Creating contact for user:', userId);
    console.log('Contact name:', name);

    if (!accessToken) {
      throw new Error('No access token provided');
    }

    if (!name) {
      throw new Error('Contact name is required');
    }

    // Validate phone format if provided
    if (phone && !isValidPhone(phone)) {
      throw new Error('Invalid phone number format');
    }

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      throw new Error('Invalid email address format');
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
