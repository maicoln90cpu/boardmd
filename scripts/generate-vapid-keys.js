/**
 * 🔑 VAPID Key Generator for Web Push
 * 
 * This script generates a valid VAPID key pair (EC P-256) for Web Push notifications.
 * 
 * Usage:
 *   node scripts/generate-vapid-keys.js
 * 
 * Output:
 *   - VAPID_PUBLIC_KEY (base64url, 65 bytes uncompressed)
 *   - VAPID_PRIVATE_KEY (base64url, 32 bytes)
 *   - VAPID_EMAIL (your contact email)
 * 
 * These keys must be configured in Lovable Cloud secrets.
 */

import { webcrypto } from 'crypto';

const { subtle } = webcrypto;

// Base64url encoding/decoding
function uint8ToBase64Url(array) {
  const base64 = Buffer.from(array).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateVapidKeys() {
  console.log('🔐 Generating VAPID EC P-256 key pair...\n');

  // Generate EC P-256 key pair
  const keyPair = await subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  // Export public key as raw (uncompressed point format)
  const publicKeyRaw = await subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyBase64 = uint8ToBase64Url(new Uint8Array(publicKeyRaw));

  // Export private key as JWK to extract 'd' (private key value)
  const privateKeyJwk = await subtle.exportKey('jwk', keyPair.privateKey);
  const privateKeyBase64 = privateKeyJwk.d; // Already in base64url format

  console.log('✅ Keys generated successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Copy these values to Lovable Cloud → Secrets:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('Secret Name: VAPID_PUBLIC_KEY');
  console.log(`Value: ${publicKeyBase64}\n`);

  console.log('Secret Name: VAPID_PRIVATE_KEY');
  console.log(`Value: ${privateKeyBase64}\n`);

  console.log('Secret Name: VAPID_EMAIL');
  console.log('Value: mailto:your-email@example.com\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  IMPORTANT: Also update .env with:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`VITE_VAPID_PUBLIC_KEY="${publicKeyBase64}"\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Verification:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`Public Key Length: ${publicKeyBase64.length} chars (should be ~87)`);
  console.log(`Private Key Length: ${privateKeyBase64.length} chars (should be ~43)`);
  console.log(`\nPublic Key (first 20): ${publicKeyBase64.substring(0, 20)}...`);
  console.log(`Private Key (first 10): ${privateKeyBase64.substring(0, 10)}...\n`);
}

generateVapidKeys().catch(console.error);
