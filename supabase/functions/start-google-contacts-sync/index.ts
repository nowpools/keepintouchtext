import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'full';
    const syncMode = body.sync_mode || 'all'; // 'all', 'phone_only', 'phone_or_email'

    console.log(`Starting Google Contacts sync for user: ${userId}, mode: ${mode}, sync_mode: ${syncMode}`);

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has Google integration connected
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('google_refresh_token')
      .eq('user_id', userId)
      .single();

    if (integrationError || !integration?.google_refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Google Contacts not connected. Please connect in Settings first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing active job
    const { data: existingJob } = await supabase
      .from('sync_jobs')
      .select('id, status')
      .eq('user_id', userId)
      .eq('job_type', 'google_contacts_sync')
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingJob) {
      console.log(`Found existing job ${existingJob.id} with status ${existingJob.status}`);
      return new Response(
        JSON.stringify({ 
          job_id: existingJob.id, 
          status: existingJob.status,
          message: 'Sync already in progress'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new sync job
    const runId = crypto.randomUUID();
    const { data: newJob, error: insertError } = await supabase
      .from('sync_jobs')
      .insert({
        user_id: userId,
        job_type: 'google_contacts_sync',
        status: 'queued',
        progress_done: 0,
        last_checkpoint: {
          nextPageToken: null,
          pageSize: 200,
          runId: runId,
          mode: mode,
        },
        job_params: {
          sync_mode: syncMode,
        },
      })
      .select('id, status')
      .single();

    if (insertError) {
      console.error('Error creating sync job:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create sync job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created sync job ${newJob.id}`);

    return new Response(
      JSON.stringify({ 
        job_id: newJob.id, 
        status: newJob.status,
        message: 'Sync job created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error starting sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
