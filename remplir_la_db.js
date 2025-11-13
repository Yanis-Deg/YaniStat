const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xdvqddbfvlsnlbcmyghl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdnFkZGJmdmxzbmxiY215Z2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTUyMDMsImV4cCI6MjA3ODUzMTIwM30.Bjbqpawz_yr6ghZ3arQXbAJ4N84Z3WiTWojJGbbyFTk'; // <-- Mettez votre clé

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const skins_a_suivre = [
    'AK-47 | Redline (Field-Tested)',
    'AWP | Asiimov (Field-Tested)',
    'Glock-18 | Water Elemental (Minimal Wear)',
    'M4A1-S | Hyper Beast (Field-Tested)',
    
    '★ Butterfly Knife | Doppler (Factory New)',
    '★ Bayonet | Autotronic (Field-Tested)',
    '★ Stiletto Knife | Marble Fade (Factory New)', 
    '★ Butterfly Knife | Lore (Field-Tested)',
    '★ Skeleton Knife | Crimson Web (Field-Tested)',
    '★ Gut Knife | Tiger Tooth (Factory New)',
    '★ Paracord Knife | Slaughter (Minimal Wear)',
    '★ Talon Knife | Blue Steel (Minimal Wear)',
    '★ Flip Knife | Gamma Doppler (Factory New)',
    '★ Huntsman Knife | Damascus Steel (Factory New)',
    '★ Bowie Knife | Ultraviolet (Field-Tested)'
];

async function getSteamPrice(itemName) {
    const encodedName = encodeURIComponent(itemName);
    const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodedName}`;
    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
            'Referer': 'https://steamcommunity.com/market/'
        }
    };
    try {
        const response = await fetch(url, options); 
        if (!response.ok) {
            console.error(`Erreur HTTP ${response.status} pour ${itemName}`);
            return null;
        }
        return await response.json();
    } catch (e) {
        console.error(`Erreur fetch pour ${itemName}:`, e.message);
        return null;
    }
}

// Fonctions pour nettoyer les données
function parsePrice(priceString) {
    return parseFloat(priceString.replace('€', '').replace(',', '.'));
}
function parseVolume(volumeString) {
    return parseInt(String(volumeString).replace(/[,.]/g, ''));
}
// NOUVEAU : Fonction pour avoir la date en format YYYY-MM-DD
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}


async function remplirLaBase() {
    console.log('Démarrage du remplissage (Mode fiable - 1 point par jour)...');
    
    let itemsPourUpsert = []; // Pour la table 'items'
    let itemsPourHistory = []; // Pour la table 'price_history'
    
    const today = getTodayDate(); // ex: "2025-11-13"

    for (const skinName of skins_a_suivre) {
        console.log(`Recherche du prix pour : ${skinName}`);
        const priceData = await getSteamPrice(skinName);
        
        if (priceData && priceData.success && priceData.lowest_price) {
            const currentPrice = parsePrice(priceData.lowest_price);
            const currentVolume = priceData.volume ? parseVolume(priceData.volume) : 0;

            console.log(`  -> Trouvé : ${currentPrice}€, Volume: ${currentVolume}`);
            
            // 1. Pour 'items' (le dernier prix)
            itemsPourUpsert.push({
                name: skinName,
                price: currentPrice,
                volume: currentVolume,
                last_updated: new Date().toISOString()
            });

            // 2. Pour 'price_history' (le point du jour)
            itemsPourHistory.push({
                name: skinName,
                price: currentPrice,
                entry_date: today // On ajoute la date du jour
                // 'timestamp' sera mis par défaut par la DB
            });

        } else {
            console.log(`  -> Échec ou pas de données pour ${skinName}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Pause
    }

    if (itemsPourUpsert.length === 0) {
        console.log('Aucune donnée n\'a été récupérée de Steam. Arrêt.');
        return;
    }

    // --- ENVOI A SUPABASE ---
    console.log(`Mise à jour 'items'...`);
    const { error: upsertError } = await supabase
        .from('items')
        .upsert(itemsPourUpsert, { onConflict: 'name' }); 
    
    if (upsertError) console.error('Erreur Supabase (items):', upsertError);
    else console.log('Table \'items\' mise à jour !');

    // --- C'EST LA CORRECTION ---
    // On utilise 'upsert' sur 'price_history'
    // S'il existe un item avec ce 'name' et cette 'entry_date', il le met à jour.
    // Sinon, il le crée.
    console.log(`Mise à jour 'price_history'...`);
    const { error: historyError } = await supabase
        .from('price_history')
        .upsert(itemsPourHistory, { onConflict: 'name, entry_date' });

    if (historyError) console.error('Erreur Supabase (price_history):', historyError);
    else console.log('Table \'price_history\' mise à jour ! (Doublons évités)');
}

remplirLaBase();