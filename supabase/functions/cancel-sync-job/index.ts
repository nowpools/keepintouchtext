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

    // Parse job_id from body
    const body = await req.json().catch(() => ({}));
    const jobId = body.job_id;

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing job_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Canceling sync job ${jobId} for user ${userId}`);

    // Use service role for update
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update job status to canceled if it's queued or running
    const { data: job, error: updateError } = await supabase
      .from('sync_jobs')
      .update({
        status: 'canceled',
        finished_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('user_id', userId)
      .in('status', ['queued', 'running'])
      .select('id, status')
      .single();

    if (updateError) {
      console.error('Error canceling job:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to cancel job. It may have already completed or been canceled.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!job) {
      return new Response(
        JSON.stringify({ error: 'Job not found or cannot be canceled' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log cancellation event
    await supabase
      .from('sync_job_items')
      .insert({
        job_id: jobId,
        event_type: 'canceled',
        payload: { canceled_by: userId, canceled_at: new Date().toISOString() },
      });

    console.log(`Successfully canceled job ${jobId}`);

    return new Response(
      JSON.stringify({ 
        job_id: job.id, 
        status: job.status,
        message: 'Sync job canceled successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error canceling sync job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
