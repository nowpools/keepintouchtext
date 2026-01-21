import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-test-notification] User ${user.id} requesting test notification`);

    // Get user's most recent device token
    const { data: tokens, error: tokenError } = await supabase
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (tokenError) {
      console.error("[send-test-notification] Token fetch error:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch device token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: "No device token registered. Enable notifications first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deviceToken = tokens[0];
    console.log(`[send-test-notification] Found token for platform: ${deviceToken.platform}`);

    // Note: Actual push notification sending requires APNs/FCM configuration
    // This is a placeholder that logs the intent
    // In production, you would:
    // 1. Use an APNs library like @parse/node-apn for iOS
    // 2. Or use Firebase Admin SDK for FCM
    // 3. Or use a push notification service like OneSignal, Pusher, etc.

    const notificationPayload = {
      title: "Test Notification 🔔",
      body: "This is a test notification from Keep In Touch!",
      data: {
        deeplink: "keepintouch://today",
      },
    };

    console.log("[send-test-notification] Would send notification:", JSON.stringify(notificationPayload));
    console.log("[send-test-notification] To device token:", deviceToken.token.substring(0, 20) + "...");

    // For now, return success indicating the notification would be sent
    // In production, replace this with actual APNs/FCM sending logic
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Test notification queued",
        note: "Push notification delivery requires APNs/FCM configuration"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-test-notification] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
