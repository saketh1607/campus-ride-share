import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, rideId, driverName, updateType, location } = await req.json();

    console.log(`Sending ${updateType} SMS to:`, phoneNumber);

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
    const devMode = Deno.env.get('SMS_DEV_MODE') === 'true';

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error('Twilio credentials not configured');
    }

    let message = '';
    switch (updateType) {
      case 'started':
        message = `🚗 Ride Started: Your child's ride with driver ${driverName} has begun! Track live: ${location}`;
        break;
      case 'midway':
        message = `📍 Ride Update: Driver ${driverName} is halfway to the destination. Ride ID: ${rideId}`;
        break;
      case 'completed':
        message = `✅ Ride Completed: Your child's ride with driver ${driverName} has been completed safely. Ride ID: ${rideId}`;
        break;
      default:
        message = `Ride update for ${rideId}`;
    }

    // Development mode - just log instead of sending
    if (devMode) {
      console.log('📱 DEV MODE - SMS would be sent:');
      console.log('To:', phoneNumber);
      console.log('Message:', message);
      return new Response(
        JSON.stringify({ success: true, messageSid: 'dev_mode_' + Date.now() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: twilioPhone,
          Body: message,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', data);
      // If rate limited, log but don't fail completely
      if (data.code === 63038) {
        console.warn('⚠️ Twilio daily limit reached - enable SMS_DEV_MODE for testing');
      }
      throw new Error(data.message || 'Failed to send SMS');
    }

    console.log(`${updateType} SMS sent successfully:`, data.sid);

    return new Response(
      JSON.stringify({ success: true, messageSid: data.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending SMS:', error);
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
