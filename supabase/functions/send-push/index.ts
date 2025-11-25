// @ts-nocheck
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Helper to convert base64url to Uint8Array
function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Send push notification using Web Push Protocol
async function sendWebPush(subscription: any, payload: string, vapidDetails: any) {
  const endpoint = subscription.endpoint;
  const userPublicKey = base64UrlToUint8Array(subscription.keys.p256dh);
  const userAuth = base64UrlToUint8Array(subscription.keys.auth);

  // Import VAPID keys
  const vapidPublicKey = base64UrlToUint8Array(vapidDetails.publicKey);
  const vapidPrivateKey = base64UrlToUint8Array(vapidDetails.privateKey);

  // Generate JWT token for VAPID
  const vapidHeaders = {
    typ: "JWT",
    alg: "ES256",
  };

  const jwtPayload = {
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: vapidDetails.subject,
  };

  const encoder = new TextEncoder();
  const header = btoa(JSON.stringify(vapidHeaders)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const body = btoa(JSON.stringify(jwtPayload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${header}.${body}`;

  // Import private key for signing
  const key = await crypto.subtle.importKey(
    "raw",
    vapidPrivateKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key,
    encoder.encode(unsignedToken)
  );

  const signatureArray = new Uint8Array(signature);
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signatureBase64}`;

  // Send the push notification
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Authorization: `vapid t=${jwt}, k=${vapidDetails.publicKey}`,
      TTL: "86400",
    },
    body: encoder.encode(payload),
  });

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

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
    const { user_id, title, body, data, notification_type } = await req.json();

    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidEmail = Deno.env.get("VAPID_EMAIL");

    if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
      throw new Error("Missing VAPID keys in environment");
    }

    const vapidDetails = {
      subject: `mailto:${vapidEmail}`,
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    };

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

      const startTime = Date.now();

      try {
        await sendWebPush(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(pushData),
          vapidDetails
        );

        const latency = Date.now() - startTime;
        success++;
        
        await supabase.from("push_logs").insert({
          user_id: sub.user_id,
          title: pushData.title,
          body: pushData.body,
          status: "delivered",
          device_name: sub.device_name,
          delivered_at: new Date().toISOString(),
          notification_type: notification_type || "system",
          latency_ms: latency,
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
          notification_type: notification_type || "system",
        });

        // Clean up expired subscriptions
        if (err.message.includes("410") || err.message.includes("404")) {
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
