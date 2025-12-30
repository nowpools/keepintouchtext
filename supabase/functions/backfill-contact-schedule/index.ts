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
    // Get auth header to identify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[backfill-contact-schedule] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[backfill-contact-schedule] Starting for user: ${user.id}`);

    const today = new Date().toISOString();
    const defaultCadence = 30;

    // Count contacts needing updates
    const { count: nullCadenceCount } = await supabase
      .from('app_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .is('cadence_days', null);

    const { count: nullNextDateCount } = await supabase
      .from('app_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .is('next_contact_date', null);

    console.log(`[backfill-contact-schedule] Found ${nullCadenceCount} contacts with null cadence, ${nullNextDateCount} with null next_contact_date`);

    // Update cadence_days where null
    const { error: cadenceError } = await supabase
      .from('app_contacts')
      .update({ cadence_days: defaultCadence })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .is('cadence_days', null);

    if (cadenceError) {
      console.error('[backfill-contact-schedule] Cadence update error:', cadenceError);
      throw cadenceError;
    }

    // Update next_contact_date where null (set to today)
    const { error: nextDateError } = await supabase
      .from('app_contacts')
      .update({ next_contact_date: today })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .is('next_contact_date', null);

    if (nextDateError) {
      console.error('[backfill-contact-schedule] Next date update error:', nextDateError);
      throw nextDateError;
    }

    const totalUpdated = (nullCadenceCount || 0) + (nullNextDateCount || 0);
    console.log(`[backfill-contact-schedule] Completed. Updated ${totalUpdated} fields.`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: {
          cadence_days: nullCadenceCount || 0,
          next_contact_date: nullNextDateCount || 0,
        },
        message: `Initialized scheduling for ${nullNextDateCount || 0} contacts`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[backfill-contact-schedule] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
