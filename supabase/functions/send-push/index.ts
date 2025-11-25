// @ts-nocheck
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import webpush from "https://esm.sh/web-push@3.6.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { user_id, title, body, data } = await req.json();

    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidEmail = Deno.env.get("VAPID_EMAIL");

    if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
      throw new Error("Missing VAPID keys in environment");
    }

    // Configure web-push with your VAPID keys
    webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey);

    // Fetch all subscriptions for this user
    const { data: subs, error } = await supabase.from("push_subscriptions").select("*").eq("user_id", user_id);

    if (error) throw error;
    if (!subs || subs.length === 0)
      return new Response(JSON.stringify({ message: "No subscriptions found" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });

    let success = 0;
    let failed = 0;

    for (const sub of subs) {
      const pushData = {
        title: title || "Notification",
        body: body || "You have a new update",
        data: data || {},
        icon: "/pwa-icon.png",
        badge: "/favicon.png",
      };

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(pushData),
        );

        success++;
        await supabase.from("push_logs").insert({
          user_id: sub.user_id,
          title: pushData.title,
          body: pushData.body,
          status: "delivered",
          device_name: sub.device_name,
          delivered_at: new Date().toISOString(),
        });
      } catch (err) {
        failed++;
        console.error("Push failed:", err.message);
        await supabase.from("push_logs").insert({
          user_id: sub.user_id,
          title: pushData.title,
          body: pushData.body,
          status: "failed",
          error_message: err.message,
          device_name: sub.device_name,
        });

        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    return new Response(JSON.stringify({ message: "Push complete", success, failed }), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
