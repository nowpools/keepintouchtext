import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateContactRequest {
  accessToken: string;
  googleId: string;
  phone?: string;
  name?: string;
  email?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, googleId, phone, name, email }: UpdateContactRequest = await req.json();

    console.log('Updating Google contact:', googleId);

    if (!accessToken) {
      throw new Error('No access token provided');
    }

    if (!googleId) {
      throw new Error('Google contact ID is required');
    }

    // First, get the current contact to get the etag (required for updates)
    const getResponse = await fetch(
      `https://people.googleapis.com/v1/${googleId}?personFields=names,phoneNumbers,emailAddresses,metadata`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error('Failed to get contact:', getResponse.status, errorText);
      throw new Error(`Failed to get contact: ${errorText}`);
    }

    const currentContact = await getResponse.json();
    const etag = currentContact.etag;

    console.log('Current contact etag:', etag);

    // Build the update request
    const updateFields: string[] = [];
    const updateBody: Record<string, unknown> = {
      etag,
    };

    if (phone !== undefined) {
      updateBody.phoneNumbers = phone ? [{ value: phone }] : [];
      updateFields.push('phoneNumbers');
    }

    if (name !== undefined) {
      updateBody.names = name ? [{ givenName: name }] : [];
      updateFields.push('names');
    }

    if (email !== undefined) {
      updateBody.emailAddresses = email ? [{ value: email }] : [];
      updateFields.push('emailAddresses');
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    console.log('Updating fields:', updateFields);
    console.log('Update body:', JSON.stringify(updateBody));

    // Update the contact in Google
    const updateResponse = await fetch(
      `https://people.googleapis.com/v1/${googleId}:updateContact?updatePersonFields=${updateFields.join(',')}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateBody),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Google API update error:', updateResponse.status, errorText);
      throw new Error(`Failed to update Google Contact: ${errorText}`);
    }

    const updatedContact = await updateResponse.json();
    console.log('Google Contact updated successfully:', updatedContact.resourceName);

    return new Response(
      JSON.stringify({ 
        success: true, 
        googleId: updatedContact.resourceName,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error updating contact:', error);
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
