import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import md5 from "https://esm.sh/blueimp-md5@2.19.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rideId, lat, lng } = await req.json();

    const pusherAppId = Deno.env.get('PUSHER_APP_ID');
    const pusherKey = Deno.env.get('PUSHER_KEY');
    const pusherSecret = Deno.env.get('PUSHER_SECRET');
    const pusherCluster = Deno.env.get('PUSHER_CLUSTER');

    if (!pusherAppId || !pusherKey || !pusherSecret || !pusherCluster) {
      throw new Error('Pusher credentials not configured');
    }

    const channelName = `ride-${rideId}`;
    const eventName = 'location-update';
    const data = JSON.stringify({ lat, lng });

    // Create request body
    const requestBody = JSON.stringify({
      name: eventName,
      channels: [channelName],
      data: data,
    });

    // Calculate MD5 hash of the body (hex)
    const bodyMd5 = md5(requestBody);

    // Pusher auth
    const timestamp = Math.floor(Date.now() / 1000);
    const authString = `POST\n/apps/${pusherAppId}/events\nauth_key=${pusherKey}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(pusherSecret);
    const messageData = encoder.encode(authString);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign({ name: "HMAC" }, cryptoKey, messageData);
    const authSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const pusherUrl = `https://api-${pusherCluster}.pusher.com/apps/${pusherAppId}/events?auth_key=${pusherKey}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}&auth_signature=${authSignature}`;

    const response = await fetch(pusherUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pusher error:', errorText);
      throw new Error('Failed to publish to Pusher');
    }

    console.log('Location published:', { rideId, lat, lng });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error publishing location:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
