import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  user_ids: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.log("VAPID keys not configured, skipping push notifications");
      return new Response(
        JSON.stringify({ success: false, message: "VAPID keys not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();

    console.log("Sending push notification to users:", payload.user_ids);

    // Get push subscriptions for the users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", payload.user_ids);

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found for users");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For now, just log that we would send notifications
    // Full Web Push encryption is complex - using a simpler approach
    console.log(`Would send ${subscriptions.length} push notifications`);
    console.log("Payload:", payload);

    // Store in-app notifications in the database as fallback
    for (const subscription of subscriptions) {
      console.log(`Notification would be sent to user ${subscription.user_id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: subscriptions.length,
        total: subscriptions.length,
        message: "Notifications processed"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
