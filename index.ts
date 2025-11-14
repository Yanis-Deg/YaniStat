// supabase/functions/get-steam-inventory/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const STEAM_KEY = Deno.env.get('STEAM_API_KEY');

    const { steamid } = await req.json();
    if (!steamid) {
      throw new Error('SteamID manquant');
    }

    const appid = 730; 
    const API_URL = `https_//api.steampowered.com/IEconItems_${appid}/GetPlayerItems/v1/`
                   + `?key=${STEAM_KEY}&steamid=${steamid}`;

    const steamResponse = await fetch(API_URL);
    if (!steamResponse.ok) {
      throw new Error(`Erreur de l'API Steam: ${steamResponse.statusText}`);
    }

    const inventoryData = await steamResponse.json();

    return new Response(
      JSON.stringify(inventoryData),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
})