import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_id?: string;
  title: string;
  body: string;
  data?: any;
  url?: string;
  notification_type?: string;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name: string | null;
}

// Helper: Convert base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper: Convert Uint8Array to base64url
function uint8ArrayToBase64Url(array: Uint8Array<ArrayBuffer>): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Generate VAPID JWT for authentication
async function generateVAPIDJWT(audience: string, privateKeyBase64: string, publicKeyBase64: string): Promise<string> {
  // Decode base64url private and public keys
  const privateKeyBytes = urlBase64ToUint8Array(privateKeyBase64);
  const publicKeyBytes = urlBase64ToUint8Array(publicKeyBase64);
  
  // Extract x and y coordinates from uncompressed public key (65 bytes: 0x04 + 32 bytes x + 32 bytes y)
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);
  
  // Construct JWK for the private key
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: uint8ArrayToBase64Url(x),
    y: uint8ArrayToBase64Url(y),
    d: uint8ArrayToBase64Url(privateKeyBytes),
    ext: true,
  };

  // Import the private key as JWK
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const jwtHeader = { typ: 'JWT', alg: 'ES256' };
  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: `mailto:${Deno.env.get('VAPID_EMAIL')}`,
  };

  const encoder = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(jwtHeader)));
  const payloadB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(jwtPayload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  // Convert DER signature to IEEE P1363 format (raw r || s, 64 bytes)
  const derSig = new Uint8Array(signature);
  
  // Parse DER: SEQUENCE { r INTEGER, s INTEGER }
  // DER structure: 0x30 [len] 0x02 [rLen] [r bytes] 0x02 [sLen] [s bytes]
  let offset = 2; // Skip 0x30 and total length
  
  // Parse r
  offset++; // Skip 0x02
  const rLen = derSig[offset++];
  const rOffset = rLen === 33 && derSig[offset] === 0 ? offset + 1 : offset; // Remove leading zero if present
  const r = derSig.slice(rOffset, rOffset + 32);
  offset = rOffset + (rLen === 33 ? 33 : rLen);
  
  // Parse s
  offset++; // Skip 0x02
  const sLen = derSig[offset++];
  const sOffset = sLen === 33 && derSig[offset] === 0 ? offset + 1 : offset; // Remove leading zero if present
  const s = derSig.slice(sOffset, sOffset + 32);
  
  // Concatenate r and s (each must be exactly 32 bytes)
  const rawSignature = new Uint8Array(64);
  
  // Pad r if needed
  if (r.length < 32) {
    rawSignature.set(new Uint8Array(32 - r.length), 0);
    rawSignature.set(r, 32 - r.length);
  } else {
    rawSignature.set(r.slice(-32), 0);
  }
  
  // Pad s if needed
  if (s.length < 32) {
    rawSignature.set(new Uint8Array(32 - s.length), 32);
    rawSignature.set(s, 32 + (32 - s.length));
  } else {
    rawSignature.set(s.slice(-32), 32);
  }
  
  const signatureB64 = uint8ArrayToBase64Url(rawSignature);
  
  return `${unsignedToken}.${signatureB64}`;
}

// Encrypt payload using AES128GCM (Web Push encryption)
async function encryptPayload(
  payload: string,
  userPublicKey: string,
  userAuthSecret: string
): Promise<{ ciphertext: Uint8Array<ArrayBuffer>; salt: Uint8Array<ArrayBuffer>; publicKey: Uint8Array<ArrayBuffer> }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key
  const rawPublicKey = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(rawPublicKey as ArrayBuffer);

  // Import user public key
  const userPublicKeyBytes = urlBase64ToUint8Array(userPublicKey);
  const importedUserPublicKey = await crypto.subtle.importKey(
    'raw',
    userPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: importedUserPublicKey },
    localKeyPair.privateKey,
    256
  );

  // Generate salt
  const saltBuffer = new ArrayBuffer(16);
  const salt = crypto.getRandomValues(new Uint8Array(saltBuffer));

  // Import auth secret
  const authSecret = urlBase64ToUint8Array(userAuthSecret);

  // Derive encryption key using HKDF
  const authInfo = encoder.encode('Content-Encoding: auth\0');
  const authKey = await crypto.subtle.importKey(
    'raw',
    authSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const prk = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(sharedSecret),
      info: authInfo,
    },
    authKey,
    256
  );

  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\0');
  const contentEncryptionKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(prk),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const ikmBuffer = new ArrayBuffer(salt.length + new Uint8Array(prk).length);
  const ikm = new Uint8Array(ikmBuffer);
  ikm.set(salt);
  ikm.set(new Uint8Array(prk), salt.length);
  const cek = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: cekInfo,
    },
    contentEncryptionKey,
    128
  );

  // Encrypt payload
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
  const nonceKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(cek),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const nonce = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: nonceInfo,
    },
    nonceKey,
    96
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(cek),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Add padding delimiter
  const paddedBuffer = new ArrayBuffer(payloadBytes.length + 2);
  const paddedPayload = new Uint8Array(paddedBuffer);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // Padding delimiter

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(nonce),
      tagLength: 128,
    },
    aesKey,
    paddedPayload
  );

  return {
    ciphertext: new Uint8Array(encrypted as ArrayBuffer),
    salt,
    publicKey: localPublicKeyBytes,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get VAPID keys from Lovable Cloud
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidEmail = Deno.env.get('VAPID_EMAIL')!;

    if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
      throw new Error('VAPID keys not configured in Lovable Cloud');
    }

    const payload: PushPayload = await req.json();

    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscriptions from database
    let query = supabase.from('push_subscriptions').select('*');
    
    if (payload.user_id) {
      query = query.eq('user_id', payload.user_id);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0, failed: 0, total: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/pwa-icon.png',
      badge: '/favicon.png',
      data: {
        url: payload.url || '/',
        ...payload.data,
      },
    });

    console.log(`📤 Sending push to ${subscriptions.length} device(s)`);

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        const startTime = Date.now();
        
        try {
          // Extract audience from endpoint
          const endpointUrl = new URL(sub.endpoint);
          const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

          // Generate VAPID JWT
          const vapidJWT = await generateVAPIDJWT(audience, vapidPrivateKey, vapidPublicKey);

          // Encrypt payload
          const { ciphertext, salt, publicKey } = await encryptPayload(
            notificationPayload,
            sub.p256dh,
            sub.auth
          );

          // Send push notification
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Encoding': 'aes128gcm',
              'Authorization': `vapid t=${vapidJWT}, k=${vapidPublicKey}`,
              'TTL': '86400',
              'Crypto-Key': `dh=${uint8ArrayToBase64Url(publicKey)}`,
              'Encryption': `salt=${uint8ArrayToBase64Url(salt)}`,
            },
            body: ciphertext.buffer,
          });

          const latency = Date.now() - startTime;

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          // Log successful delivery
          await supabase.from('push_logs').insert({
            user_id: sub.user_id,
            title: payload.title,
            body: payload.body,
            status: 'delivered',
            error_message: null,
            data: payload.data,
            notification_type: payload.notification_type || 'manual',
            device_name: sub.device_name,
            delivered_at: new Date().toISOString(),
            latency_ms: latency,
          });

          console.log(`✅ Delivered to ${sub.device_name || sub.id} (${latency}ms)`);

          return { 
            success: true, 
            subscription: sub.id,
            device_name: sub.device_name,
            latency 
          };

        } catch (error: any) {
          const latency = Date.now() - startTime;
          const errorMessage = error.message || 'Unknown error';
          const statusCode = error.status || 500;

          console.error(`❌ Failed to send to ${sub.device_name || sub.id}:`, errorMessage);

          // Log failed delivery
          await supabase.from('push_logs').insert({
            user_id: sub.user_id,
            title: payload.title,
            body: payload.body,
            status: 'failed',
            error_message: errorMessage,
            data: payload.data,
            notification_type: payload.notification_type || 'manual',
            device_name: sub.device_name,
            latency_ms: latency,
          });

          // Remove expired or invalid subscriptions (410 Gone, 404 Not Found)
          if (statusCode === 410 || statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            console.log(`🗑️ Removed expired subscription: ${sub.id}`);
          }

          return { 
            success: false, 
            subscription: sub.id, 
            device_name: sub.device_name,
            error: errorMessage,
          };
        }
      })
    );

    // Calculate statistics
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`📊 Push notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications processed',
        sent: successful,
        failed,
        total: results.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in send-push function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
