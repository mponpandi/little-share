import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "https://esm.sh/web-push@3.6.7";

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

// Input validation constants
const MAX_TITLE_LENGTH = 100;
const MAX_BODY_LENGTH = 500;
const MAX_USER_IDS = 50;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    // Extract and verify JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Missing authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    
    // Create a client with the user's JWT to verify authentication
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });

    // Verify the JWT and get the user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !user) {
      console.error("JWT verification failed:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = user.id;
    console.log(`Authenticated user ${callerId} requesting to send notifications`);

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ success: false, error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure web-push with VAPID keys
    webPush.setVapidDetails(
      "mailto:support@donateconnect.app",
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();

    // Input validation
    if (!payload.title || typeof payload.title !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid input: title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload.body || typeof payload.body !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid input: body is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.title.length > MAX_TITLE_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid input: title exceeds ${MAX_TITLE_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.body.length > MAX_BODY_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid input: body exceeds ${MAX_BODY_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(payload.user_ids) || payload.user_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid input: user_ids must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.user_ids.length > MAX_USER_IDS) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid input: user_ids exceeds maximum of ${MAX_USER_IDS}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format for user_ids
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const userId of payload.user_ids) {
      if (typeof userId !== "string" || !uuidRegex.test(userId)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid input: user_ids must contain valid UUIDs" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Authorization check: Verify the caller has permission to notify these users
    const authorizedUserIds: string[] = [];

    for (const targetUserId of payload.user_ids) {
      // Always allow notifying yourself
      if (targetUserId === callerId) {
        authorizedUserIds.push(targetUserId);
        continue;
      }

      // Check if target user has requested any of caller's items
      const { data: callerItems } = await supabase
        .from("items")
        .select("id")
        .eq("donor_id", callerId);

      if (callerItems && callerItems.length > 0) {
        const itemIds = callerItems.map(item => item.id);
        const { data: requestsFromTarget } = await supabase
          .from("requests")
          .select("id")
          .in("item_id", itemIds)
          .eq("receiver_id", targetUserId)
          .limit(1);

        if (requestsFromTarget && requestsFromTarget.length > 0) {
          authorizedUserIds.push(targetUserId);
          continue;
        }
      }

      // Check if caller has requested any of target user's items
      const { data: targetItems } = await supabase
        .from("items")
        .select("id")
        .eq("donor_id", targetUserId);

      if (targetItems && targetItems.length > 0) {
        const itemIds = targetItems.map(item => item.id);
        const { data: requestsByCallerToTarget } = await supabase
          .from("requests")
          .select("id")
          .in("item_id", itemIds)
          .eq("receiver_id", callerId)
          .limit(1);

        if (requestsByCallerToTarget && requestsByCallerToTarget.length > 0) {
          authorizedUserIds.push(targetUserId);
          continue;
        }
      }

      console.log(`User ${callerId} not authorized to notify user ${targetUserId}`);
    }

    if (authorizedUserIds.length === 0) {
      console.log(`User ${callerId} attempted to notify users without authorization`);
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: Not authorized to notify these users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${callerId} authorized to notify ${authorizedUserIds.length}/${payload.user_ids.length} users`);

    // Get push subscriptions for authorized users only
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", authorizedUserIds);

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found for authorized users");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send actual push notifications using web-push library
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      icon: "/favicon.ico",
    });

    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        await webPush.sendNotification(pushSubscription, notificationPayload);
        sentCount++;
        console.log(`Push notification sent to user ${subscription.user_id}`);
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        console.error(`Failed to send push to ${subscription.endpoint}:`, error);
        failedEndpoints.push(subscription.endpoint);
        
        // Remove invalid/expired subscriptions (410 Gone or 404 Not Found)
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Removing expired subscription: ${subscription.endpoint}`);
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", subscription.endpoint);
        }
      }
    }

    // Audit log
    console.log(`AUDIT: User ${callerId} sent ${sentCount}/${subscriptions.length} notifications at ${new Date().toISOString()}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount,
        failed: failedEndpoints.length,
        authorized: authorizedUserIds.length,
        total: payload.user_ids.length,
        message: `${sentCount} notifications sent successfully`
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
