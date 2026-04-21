import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Decode HERE flexible polyline (https://github.com/heremaps/flexible-polyline)
const DECODING_TABLE = [
  62, -1, -1, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
  -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, -1, -1, -1, -1, 63, -1, 26, 27, 28, 29, 30, 31, 32,
  33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
];

function decodeHerePolyline(encoded: string): [number, number][] {
  const decoder = decodeUnsignedValues(encoded);
  const header = decodeHeader(decoder[0], decoder[1]);
  const factorLat = Math.pow(10, header.precision);
  const factorLng = Math.pow(10, header.precision);
  const thirdDimPrecision = header.thirdDimPrecision ?? 0;
  const factorZ = Math.pow(10, thirdDimPrecision);
  const thirdDim = header.thirdDim;

  let lastLat = 0, lastLng = 0, lastZ = 0;
  const res: [number, number][] = [];
  let i = 2;
  for (; i < decoder.length;) {
    const deltaLat = toSigned(decoder[i]) / factorLat;
    const deltaLng = toSigned(decoder[i + 1]) / factorLng;
    lastLat += deltaLat;
    lastLng += deltaLng;
    if (thirdDim) {
      lastZ += toSigned(decoder[i + 2]) / factorZ;
      i += 3;
    } else {
      i += 2;
    }
    res.push([lastLat, lastLng]);
  }
  return res;
}
function decodeChar(char: string): number {
  const c = char.charCodeAt(0) - 45;
  return DECODING_TABLE[c];
}
function decodeUnsignedValues(encoded: string): number[] {
  let result = 0n; let shift = 0n;
  const out: number[] = [];
  for (const ch of encoded) {
    const v = decodeChar(ch);
    if (v < 0) throw new Error('Invalid encoding');
    result |= (BigInt(v) & 0x1Fn) << shift;
    if ((v & 0x20) === 0) {
      out.push(Number(result));
      result = 0n; shift = 0n;
    } else {
      shift += 5n;
    }
  }
  return out;
}
function decodeHeader(version: number, encodedHeader: number) {
  if (version !== 1) throw new Error('Unsupported version');
  const precision = encodedHeader & 15;
  const thirdDim = (encodedHeader >> 4) & 7;
  const thirdDimPrecision = (encodedHeader >> 7) & 15;
  return { precision, thirdDim, thirdDimPrecision };
}
function toSigned(val: number): number {
  let res = val;
  if (res & 1) res = ~res;
  res >>= 1;
  return res;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const HERE_API_KEY = Deno.env.get('HERE_API_KEY');
    if (!HERE_API_KEY) {
      return new Response(JSON.stringify({ error: 'HERE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      waypoints,
      vehicleWeight = 44000,
      vehicleHeight = 4.0,
      vehicleLength = 16.5,
      vehicleWidth = 2.55,
      vehicleAxleWeight = 11500,
      avoidTolls = false,
      avoidHighways = false,
    } = await req.json();

    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      return new Response(JSON.stringify({ error: 'At least 2 waypoints required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = `${waypoints[0].lat},${waypoints[0].lon}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lon}`;
    const via = waypoints.slice(1, -1).map((w: any) => `via=${w.lat},${w.lon}`).join('&');

    const avoidFeatures: string[] = [];
    if (avoidTolls) avoidFeatures.push('tollRoad');
    if (avoidHighways) avoidFeatures.push('controlledAccessHighway');

    const params = new URLSearchParams({
      transportMode: 'truck',
      origin,
      destination,
      return: 'polyline,summary,tolls,actions',
      apiKey: HERE_API_KEY,
      'truck[grossWeight]': String(vehicleWeight),
      'truck[height]': String(Math.round(vehicleHeight * 100)),
      'truck[length]': String(Math.round(vehicleLength * 100)),
      'truck[width]': String(Math.round(vehicleWidth * 100)),
      'truck[weightPerAxle]': String(vehicleAxleWeight),
      'truck[axleCount]': '5',
      currency: 'EUR',
      lang: 'fr-FR',
    });
    if (avoidFeatures.length > 0) {
      params.append('avoid[features]', avoidFeatures.join(','));
    }

    const url = `https://router.hereapi.com/v8/routes?${params}${via ? '&' + via : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      const txt = await response.text();
      console.error('HERE routing error:', response.status, txt);
      return new Response(JSON.stringify({ error: 'HERE routing failed', detail: txt }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    if (!data.routes?.length) {
      return new Response(JSON.stringify({ error: 'No route found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const route = data.routes[0];
    let totalDistance = 0; // meters
    let totalDuration = 0; // seconds
    let totalToll = 0; // EUR
    const coordinates: [number, number][] = [];

    for (const section of route.sections) {
      totalDistance += section.summary?.length ?? 0;
      totalDuration += section.summary?.duration ?? 0;
      if (section.tolls) {
        for (const toll of section.tolls) {
          for (const fare of toll.fares ?? []) {
            if (fare.price?.value) totalToll += Number(fare.price.value);
          }
        }
      }
      if (section.polyline) {
        try {
          const coords = decodeHerePolyline(section.polyline);
          coordinates.push(...coords);
        } catch (e) {
          console.error('Polyline decode error:', e);
        }
      }
    }

    return new Response(JSON.stringify({
      distanceKm: Math.round((totalDistance / 1000) * 10) / 10,
      durationHours: Math.round((totalDuration / 3600) * 100) / 100,
      tollCost: Math.round(totalToll * 100) / 100,
      coordinates,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown';
    console.error('here-route error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});