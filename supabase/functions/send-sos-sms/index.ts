import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import btoa from 'btoa';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PORT = process.env.PORT || 5000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
  res.header('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/send-sos-sms', async (req, res) => {
  try {
    const { phoneNumber, driverName, location, rideId } = req.body;

    console.log('Sending SOS SMS to:', phoneNumber);

    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
    const devMode = process.env.SMS_DEV_MODE === 'true';

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured');
    }

    const message = `🚨 EMERGENCY ALERT 🚨\n\nYour child's driver (${driverName}) has triggered an SOS alert!\n\nRide ID: ${rideId}\n${location}\n\nPlease check on them immediately or contact emergency services if needed.`;

    // Development mode - just log instead of sending
    if (devMode) {
      console.log('🚨 DEV MODE - SOS SMS would be sent:');
      console.log('To:', phoneNumber);
      console.log('Message:', message);
      return res.json({ success: true, messageSid: 'dev_sos_' + Date.now() });
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: TWILIO_PHONE_NUMBER,
        Body: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twilio error:', errorText);
      throw new Error(`Failed to send SMS: ${response.status}`);
    }

    const data = await response.json();
    console.log('SOS SMS sent successfully:', data.sid);

    res.json({ success: true, messageSid: data.sid });
  } catch (error) {
    console.error('Error in send-sos-sms function:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

app.listen(PORT, () => console.log(`SMS server running on port ${PORT}`));
