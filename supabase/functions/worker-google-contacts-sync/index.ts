import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const BATCH_PAGE_SIZE = 200;
const MAX_PAGES_PER_TICK = 2;

interface Checkpoint {
  nextPageToken: string | null;
  pageSize: number;
  runId: string;
  mode?: string;
  lastPerson?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
      console.error('Missing Google OAuth credentials');
      return new Response(
        JSON.stringify({ error: 'Google OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Worker tick: Looking for jobs to process');

    // Fetch one queued or running job (prefer queued)
    const { data: job, error: jobError } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('job_type', 'google_contacts_sync')
      .in('status', ['queued', 'running'])
      .order('status', { ascending: true }) // 'queued' comes before 'running' alphabetically
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (jobError || !job) {
      console.log('No jobs to process');
      return new Response(
        JSON.stringify({ message: 'No jobs to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing job ${job.id} for user ${job.user_id}, status: ${job.status}`);

    const userId = job.user_id;
    let checkpoint: Checkpoint = job.last_checkpoint || {
      nextPageToken: null,
      pageSize: BATCH_PAGE_SIZE,
      runId: crypto.randomUUID(),
    };

    // If job is queued, transition to running
    if (job.status === 'queued') {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      await supabase.from('sync_job_items').insert({
        job_id: job.id,
        event_type: 'job_started',
        payload: { started_at: new Date().toISOString() },
      });
    }

    // Get user's Google tokens
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('user_id', userId)
      .single();

    if (integrationError || !integration?.google_refresh_token) {
      await markJobFailed(supabase, job.id, 'Google Contacts not connected');
      return new Response(
        JSON.stringify({ error: 'Google Contacts not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    let accessToken = integration.google_access_token;
    const tokenExpiry = integration.google_token_expiry ? new Date(integration.google_token_expiry).getTime() : 0;
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (!accessToken || tokenExpiry - bufferMs < now) {
      console.log('Refreshing Google token');
      const refreshResult = await refreshGoogleToken(
        integration.google_refresh_token,
        googleClientId,
        googleClientSecret
      );

      if (!refreshResult.success) {
        await markJobFailed(supabase, job.id, 'Failed to refresh Google token');
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = refreshResult.accessToken;

      // Update stored tokens
      await supabase
        .from('user_integrations')
        .update({
          google_access_token: accessToken,
          google_token_expiry: new Date(Date.now() + (refreshResult.expiresIn || 3600) * 1000).toISOString(),
        })
        .eq('user_id', userId);
    }

    let totalProcessed = job.progress_done || 0;
    let pagesProcessed = 0;

    // Process pages
    while (pagesProcessed < MAX_PAGES_PER_TICK) {
      const pageToken = checkpoint.nextPageToken;
      console.log(`Fetching page ${pagesProcessed + 1}, pageToken: ${pageToken ? 'present' : 'none'}`);

      const googleUrl = new URL('https://people.googleapis.com/v1/people/me/connections');
      googleUrl.searchParams.set('pageSize', String(BATCH_PAGE_SIZE));
      googleUrl.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,organizations,biographies,addresses,urls,birthdays,photos,memberships');
      if (pageToken) {
        googleUrl.searchParams.set('pageToken', pageToken);
      }

      const googleResponse = await fetch(googleUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!googleResponse.ok) {
        const errorText = await googleResponse.text();
        console.error('Google API error:', googleResponse.status, errorText);
        
        if (googleResponse.status === 401) {
          await markJobFailed(supabase, job.id, 'Google authentication expired');
        } else {
          await markJobFailed(supabase, job.id, `Google API error: ${googleResponse.status}`);
        }
        
        return new Response(
          JSON.stringify({ error: 'Google API error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const googleData = await googleResponse.json();
      const connections = googleData.connections || [];
      const nextPageToken = googleData.nextPageToken || null;
      const totalPeople = googleData.totalPeople || null;

      console.log(`Received ${connections.length} contacts, nextPageToken: ${nextPageToken ? 'present' : 'none'}`);

      // Process contacts
      const batchResult = await processContactsBatch(supabase, userId, connections);
      totalProcessed += batchResult.processed;

      // Log batch completion
      await supabase.from('sync_job_items').insert({
        job_id: job.id,
        event_type: 'batch_completed',
        payload: {
          page: pagesProcessed + 1,
          contacts_in_batch: connections.length,
          contacts_processed: batchResult.processed,
          total_processed: totalProcessed,
        },
      });

      // Update checkpoint
      checkpoint.nextPageToken = nextPageToken;
      checkpoint.lastPerson = connections.length > 0 ? connections[connections.length - 1].resourceName : checkpoint.lastPerson;

      // Update job progress
      await supabase
        .from('sync_jobs')
        .update({
          progress_done: totalProcessed,
          progress_total_estimate: totalPeople,
          last_checkpoint: checkpoint,
        })
        .eq('id', job.id);

      pagesProcessed++;

      // Check if we're done
      if (!nextPageToken) {
        console.log(`Sync completed! Total contacts processed: ${totalProcessed}`);
        
        await supabase
          .from('sync_jobs')
          .update({
            status: 'completed',
            finished_at: new Date().toISOString(),
            progress_done: totalProcessed,
            last_checkpoint: checkpoint,
          })
          .eq('id', job.id);

        await supabase.from('sync_job_items').insert({
          job_id: job.id,
          event_type: 'job_completed',
          payload: { 
            finished_at: new Date().toISOString(),
            total_processed: totalProcessed,
          },
        });

        // Update last_sync_google timestamp
        await supabase
          .from('user_integrations')
          .update({ last_sync_google: new Date().toISOString() })
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({ 
            message: 'Sync completed',
            total_processed: totalProcessed,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Processed ${pagesProcessed} pages this tick, total contacts: ${totalProcessed}`);

    return new Response(
      JSON.stringify({ 
        message: 'Batch processed, more to do',
        pages_processed: pagesProcessed,
        total_processed: totalProcessed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Worker error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ success: boolean; accessToken?: string; expiresIn?: number }> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return { success: false };
    }

    const data = await response.json();
    return {
      success: true,
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false };
  }
}

async function markJobFailed(supabase: any, jobId: string, errorMessage: string) {
  await supabase
    .from('sync_jobs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      finished_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  await supabase.from('sync_job_items').insert({
    job_id: jobId,
    event_type: 'error',
    payload: { error: errorMessage, timestamp: new Date().toISOString() },
  });
}

async function processContactsBatch(
  supabase: any,
  userId: string,
  connections: any[]
): Promise<{ processed: number; created: number; updated: number }> {
  let processed = 0;
  let created = 0;
  let updated = 0;

  for (const person of connections) {
    const displayName = person.names?.[0]?.displayName;
    if (!displayName) continue;

    const googleResourceName = person.resourceName;
    const googleEtag = person.etag;
    const givenName = person.names?.[0]?.givenName || null;
    const familyName = person.names?.[0]?.familyName || null;

    const phones = person.phoneNumbers?.map((p: any) => ({
      value: p.value,
      type: p.type || 'other',
    })) || null;

    const emails = person.emailAddresses?.map((e: any) => ({
      value: e.value,
      type: e.type || 'other',
    })) || null;

    // Extract birthday
    let birthday: string | null = null;
    if (person.birthdays?.[0]?.date) {
      const bday = person.birthdays[0].date;
      if (bday.month && bday.day) {
        const year = bday.year || 1900;
        birthday = `${year}-${String(bday.month).padStart(2, '0')}-${String(bday.day).padStart(2, '0')}`;
      }
    }

    // Extract label from memberships
    let label: string | null = null;
    if (person.memberships) {
      for (const membership of person.memberships) {
        const groupName = membership.contactGroupMembership?.contactGroupResourceName;
        if (groupName) {
          const labelPart = groupName.split('/').pop();
          if (labelPart && labelPart !== 'myContacts') {
            label = labelPart;
            break;
          }
        }
      }
    }

    // Check if contact exists by google_resource_name
    const { data: existingByGoogle } = await supabase
      .from('app_contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('google_resource_name', googleResourceName)
      .single();

    if (existingByGoogle) {
      // Update existing contact
      await supabase
        .from('app_contacts')
        .update({
          display_name: displayName,
          given_name: givenName,
          family_name: familyName,
          phones,
          emails,
          label,
          birthday,
          google_etag: googleEtag,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingByGoogle.id);
      updated++;
    } else {
      // Check by contact_links external_id as fallback
      const { data: existingLink } = await supabase
        .from('contact_links')
        .select('app_contact_id')
        .eq('user_id', userId)
        .eq('external_id', googleResourceName)
        .eq('source', 'google')
        .single();

      if (existingLink) {
        // Update existing contact found via link
        await supabase
          .from('app_contacts')
          .update({
            display_name: displayName,
            given_name: givenName,
            family_name: familyName,
            phones,
            emails,
            label,
            birthday,
            google_resource_name: googleResourceName,
            google_etag: googleEtag,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLink.app_contact_id);
        updated++;
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
            birthday,
            google_resource_name: googleResourceName,
            google_etag: googleEtag,
            source_preference: 'google',
          })
          .select('id')
          .single();

        if (!insertError && newContact) {
          // Create contact link
          await supabase.from('contact_links').insert({
            user_id: userId,
            app_contact_id: newContact.id,
            external_id: googleResourceName,
            source: 'google',
            sync_enabled: true,
            last_pulled_at: new Date().toISOString(),
          });
          created++;
        }
      }
    }

    processed++;
  }

  return { processed, created, updated };
}
