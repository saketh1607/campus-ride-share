import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startLat, startLng, endLat, endLng } = await req.json();

    console.log('Fetching directions from OSRM...');
    console.log('Start:', startLng, startLat, 'End:', endLng, endLat);

    // Use OSRM (free, no API key needed)
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?steps=true&overview=full&geometries=geojson`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OSRM API error:', response.status, errorText);
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OSRM API response received');

    // Extract turn-by-turn directions from steps
    const directions: string[] = [];
    if (data.routes?.[0]?.legs?.[0]?.steps) {
      const steps = data.routes[0].legs[0].steps;
      steps.forEach((step: any) => {
        // OSRM provides maneuver info - create readable instruction
        const maneuver = step.maneuver;
        const type = maneuver.type;
        const modifier = maneuver.modifier || '';
        const streetName = step.name || 'unnamed road';
        
        let instruction = '';
        if (type === 'depart') {
          instruction = `Head ${modifier} on ${streetName}`;
        } else if (type === 'arrive') {
          instruction = 'You have arrived at your destination';
        } else if (type === 'turn') {
          instruction = `Turn ${modifier} onto ${streetName}`;
        } else if (type === 'merge') {
          instruction = `Merge ${modifier} onto ${streetName}`;
        } else if (type === 'roundabout' || type === 'rotary') {
          instruction = `Take the roundabout and exit onto ${streetName}`;
        } else if (type === 'continue') {
          instruction = `Continue on ${streetName}`;
        } else {
          instruction = `${type} ${modifier} on ${streetName}`.trim();
        }
        
        directions.push(instruction);
      });
    }

    console.log('Extracted', directions.length, 'directions');

    return new Response(
      JSON.stringify({ 
        success: true, 
        directions,
        rawData: data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-directions function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
