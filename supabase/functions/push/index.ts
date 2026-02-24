// ============================================================================
// Push Notification Edge Function
// Triggered by webhook on notifications INSERT
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface NotificationPayload {
  type: "INSERT";
  table: "notifications";
  record: {
    id: string;
    recipient_id: string;
    sender_id: string | null;
    type: string;
    video_id: string | null;
    title: string;
    body: string;
    sent_at: string | null;
    read_at: string | null;
    created_at: string;
  };
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  badge?: number;
}

Deno.serve(async (req: Request) => {
  try {
    const payload: NotificationPayload = await req.json();

    // Only process INSERT events
    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const notification = payload.record;

    // Skip if already sent
    if (notification.sent_at) {
      return new Response(JSON.stringify({ skipped: true, reason: "already_sent" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get recipient's push token and settings
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("expo_push_token, push_enabled, badge_count")
      .eq("id", notification.recipient_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Recipient not found", details: profileError }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if push is enabled and token exists
    if (!profile.push_enabled || !profile.expo_push_token) {
      // Mark as sent anyway to avoid retries
      await supabase
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", notification.id);

      return new Response(
        JSON.stringify({ skipped: true, reason: "push_disabled_or_no_token" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Increment badge count
    const newBadgeCount = (profile.badge_count || 0) + 1;

    // Build push message
    const pushMessage: ExpoPushMessage = {
      to: profile.expo_push_token,
      title: notification.title,
      body: notification.body,
      sound: "default",
      badge: newBadgeCount,
      data: {
        notification_id: notification.id,
        type: notification.type,
        video_id: notification.video_id,
      },
    };

    // Send to Expo Push API
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(Deno.env.get("EXPO_ACCESS_TOKEN")
          ? { Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}` }
          : {}),
      },
      body: JSON.stringify(pushMessage),
    });

    const expoResult = await expoResponse.json();

    // Update notification as sent and increment badge
    await supabase
      .from("notifications")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", notification.id);

    await supabase
      .from("profiles")
      .update({ badge_count: newBadgeCount })
      .eq("id", notification.recipient_id);

    return new Response(
      JSON.stringify({ success: true, expo_result: expoResult }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
