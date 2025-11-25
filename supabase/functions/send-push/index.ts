import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import * as jose from 'https://deno.land/x/jose@v4.3.8/index.ts';

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

// Generate VAPID JWT for authentication using jose (ES256)
async function generateVAPIDJWT(
  audience: string,
  privateKeyBase64: string,
  publicKeyBase64: string,
  email: string,
): Promise<string> {
  // Extract x and y coordinates from the public key (uncompressed P-256 format: 0x04 + 32 bytes x + 32 bytes y)
  const publicKeyBytes = urlBase64ToUint8Array(publicKeyBase64);
  
  if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error('Invalid public key format: expected 65 bytes starting with 0x04');
  }
  
  const x = publicKeyBytes.slice(1, 33);   // X coordinate (32 bytes)
  const y = publicKeyBytes.slice(33, 65);  // Y coordinate (32 bytes)
  
  // Create complete JWK with x, y, and d
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKeyBase64,
    x: uint8ArrayToBase64Url(x),
    y: uint8ArrayToBase64Url(y),
  };

  const cryptoKey = await jose.importJWK(jwk, 'ES256');

  const now = Math.floor(Date.now() / 1000);

  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setAudience(audience)
    .setExpirationTime(now + 12 * 60 * 60) // 12 hours
    .setSubject(`mailto:${email}`)
    .sign(cryptoKey);

  return jwt;
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

    const requestBody: any = await req.json();

    // Handle VAPID validation request
    if (requestBody.action === 'validate_vapid') {
      console.log('🔍 Validating VAPID configuration...');
      
      try {
        // Validate key format
        const publicKeyBytes = urlBase64ToUint8Array(vapidPublicKey);
        const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey);
        
        const isPublicKeyValid = publicKeyBytes.length === 65 && publicKeyBytes[0] === 0x04;
        const isPrivateKeyValid = privateKeyBytes.length === 32;
        
        // Try to generate a test JWT
        let jwtValid = false;
        try {
          const testJWT = await generateVAPIDJWT('https://fcm.googleapis.com', vapidPrivateKey, vapidPublicKey, vapidEmail);
          jwtValid = testJWT.length > 0;
        } catch (error) {
          console.error('JWT generation failed:', error);
        }
        
        const valid = isPublicKeyValid && isPrivateKeyValid && jwtValid;
        
        console.log(`✅ VAPID Validation Result: ${valid ? 'VALID' : 'INVALID'}`);
        console.log(`  - Public Key: ${isPublicKeyValid ? '✅' : '❌'} (${publicKeyBytes.length} bytes)`);
        console.log(`  - Private Key: ${isPrivateKeyValid ? '✅' : '❌'} (${privateKeyBytes.length} bytes)`);
        console.log(`  - JWT Generation: ${jwtValid ? '✅' : '❌'}`);
        
        return new Response(
          JSON.stringify({ 
            valid,
            publicKeyLength: publicKeyBytes.length,
            privateKeyLength: privateKeyBytes.length,
            jwtValid,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('❌ VAPID validation error:', error);
        return new Response(
          JSON.stringify({ valid: false, error: error instanceof Error ? error.message : 'Unknown error' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle single device test request
    if (requestBody.action === 'test_single' && requestBody.device_id) {
      console.log(`🧪 Testing single device: ${requestBody.device_id}`);
      
      const { data: device, error: deviceError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('id', requestBody.device_id)
        .single();

      if (deviceError || !device) {
        return new Response(
          JSON.stringify({ success: false, error: 'Device not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const startTime = Date.now();
      
      try {
        const endpointUrl = new URL(device.endpoint);
        const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
        
        const vapidJWT = await generateVAPIDJWT(audience, vapidPrivateKey, vapidPublicKey, vapidEmail);
        
        const notificationPayload = JSON.stringify({
          title: requestBody.title,
          body: requestBody.body,
          icon: '/pwa-icon.png',
          badge: '/favicon.png',
          data: { url: '/', test: true },
        });

        const { ciphertext, salt, publicKey } = await encryptPayload(
          notificationPayload,
          device.p256dh,
          device.auth
        );

        const response = await fetch(device.endpoint, {
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

        const latency_ms = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Test failed: HTTP ${response.status} - ${errorText}`);
          
          await supabase.from('push_logs').insert({
            user_id: requestBody.user_id,
            title: requestBody.title,
            body: requestBody.body,
            status: 'failed',
            error_message: `HTTP ${response.status}: ${errorText}`,
            notification_type: 'test_single',
            device_name: device.device_name,
            latency_ms,
          });

          return new Response(
            JSON.stringify({ success: false, error: `HTTP ${response.status}: ${errorText}`, latency_ms }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase.from('push_logs').insert({
          user_id: requestBody.user_id,
          title: requestBody.title,
          body: requestBody.body,
          status: 'delivered',
          notification_type: 'test_single',
          device_name: device.device_name,
          delivered_at: new Date().toISOString(),
          latency_ms,
        });

        console.log(`✅ Test successful! Latency: ${latency_ms}ms`);

        return new Response(
          JSON.stringify({ success: true, latency_ms, device_name: device.device_name }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        const latency_ms = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error(`❌ Test error:`, errorMessage);

        await supabase.from('push_logs').insert({
          user_id: requestBody.user_id,
          title: requestBody.title,
          body: requestBody.body,
          status: 'failed',
          error_message: errorMessage,
          notification_type: 'test_single',
          device_name: device.device_name,
          latency_ms,
        });

        return new Response(
          JSON.stringify({ success: false, error: errorMessage, latency_ms }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 🔍 DEBUG: Validate VAPID keys for regular push
    console.log('🔑 VAPID Keys Loaded:');
    console.log(`  - Public Key Length: ${vapidPublicKey.length} chars`);
    console.log(`  - Private Key Length: ${vapidPrivateKey.length} chars`);
    console.log(`  - Email: ${vapidEmail}`);
    console.log(`  - Public Key (first 20 chars): ${vapidPublicKey.substring(0, 20)}...`);
    
    // Validate key format
    const publicKeyBytes = urlBase64ToUint8Array(vapidPublicKey);
    const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey);
    console.log(`  - Public Key Bytes: ${publicKeyBytes.length} (expected: 65 for uncompressed P-256)`);
    console.log(`  - Private Key Bytes: ${privateKeyBytes.length} (expected: 32 for P-256)`);
    
    if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
      console.error('❌ Invalid public key format! Expected 65 bytes starting with 0x04');
    }
    if (privateKeyBytes.length !== 32) {
      console.error('❌ Invalid private key format! Expected 32 bytes');
    }

    const payload: PushPayload = requestBody;

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

          // 🔍 DEBUG: Log endpoint details
          console.log(`\n📱 Processing device: ${sub.device_name || sub.id}`);
          console.log(`  - Endpoint: ${sub.endpoint.substring(0, 50)}...`);
          console.log(`  - Audience: ${audience}`);
          console.log(`  - Platform: ${endpointUrl.hostname.includes('fcm') ? 'FCM (Android)' : endpointUrl.hostname.includes('push.apple') ? 'APNS (iOS)' : 'Unknown'}`);

          // Generate VAPID JWT
          const vapidJWT = await generateVAPIDJWT(audience, vapidPrivateKey, vapidPublicKey, vapidEmail);
          
          // 🔍 DEBUG: Validate JWT
          console.log(`  - JWT Generated: ${vapidJWT.substring(0, 30)}...${vapidJWT.substring(vapidJWT.length - 30)}`);
          console.log(`  - JWT Length: ${vapidJWT.length} chars`);

          // Encrypt payload
          const { ciphertext, salt, publicKey } = await encryptPayload(
            notificationPayload,
            sub.p256dh,
            sub.auth
          );

          // 🔍 DEBUG: Log encryption details
          console.log(`  - Payload Size: ${notificationPayload.length} chars`);
          console.log(`  - Encrypted Size: ${ciphertext.length} bytes`);
          console.log(`  - Salt: ${uint8ArrayToBase64Url(salt).substring(0, 20)}...`);
          console.log(`  - DH Public Key: ${uint8ArrayToBase64Url(publicKey).substring(0, 20)}...`);

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

          // 🔍 DEBUG: Log HTTP response
          console.log(`  - HTTP Status: ${response.status} ${response.statusText}`);
          console.log(`  - Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`  ❌ Push Service Error Response: ${errorText}`);
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
