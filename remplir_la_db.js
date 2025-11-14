const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xdvqddbfvlsnlbcmyghl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdnFkZGJmdmxzbmxiY215Z2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTUyMDMsImV4cCI6MjA3ODUzMTIwM30.Bjbqpawz_yr6ghZ3arQXbAJ4N84Z3WiTWojJGbbyFTk'; // <-- Mettez votre clé

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- NOUVELLE LISTE "INTELLIGENTE" ---
// C'est maintenant une liste d'objets
const skins_a_suivre = [
    // Fusils d'assaut
    { name: 'AK-47 | Redline (Field-Tested)', category: "Fusils d'assaut" },
    { name: 'M4A1-S | Hyper Beast (Field-Tested)', category: "Fusils d'assaut" },
    
    // Snipers
    { name: 'AWP | Asiimov (Field-Tested)', category: 'Snipers' },

    // Pistolets
    { name: 'Glock-18 | Water Elemental (Minimal Wear)', category: 'Pistolets' },
    { name: 'Desert Eagle | Blaze (Factory New)', category: 'Pistolets' },

    // Couteaux
    { name: '★ Butterfly Knife | Lore (Field-Tested)', category: 'Couteaux' },
    { name: '★ Skeleton Knife | Crimson Web (Field-Tested)', category: 'Couteaux' },
    { name: '★ Gut Knife | Tiger Tooth (Factory New)', category: 'Couteaux' },

    // Gants
    // { name: '★ Sport Gloves | Vice (Field-Tested)', category: 'Gants' },
];
// ------------------------------------

// Fonction pour récupérer le PRIX ACTUEL
async function getSteamPrice(itemName) {
    const encodedName = encodeURIComponent(itemName);
    const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodedName}`;
    const options = { /* ... (headers comme avant) ... */ }; 
    try {
        const response = await fetch(url, options); 
        if (!response.ok) { return null; }
        return await response.json();
    } catch (e) { return null; }
}

// --- NOUVELLE FONCTION (L'ASTUCE) ---
// On "devine" l'URL de l'image
function getImageUrl(itemName) {
    // 1. Enlève l'usure (ex: "(Field-Tested)") et l'étoile "★ "
    let simpleName = itemName
        .replace(/\s*\([^)]*\)$/, '') // Enlève "(Field-Tested)" etc.
        .replace('★ ', ''); // Enlève le "★ " des couteaux

    // 2. Encode le nom pour une URL
    const encodedName = encodeURIComponent(simpleName);
    
    // 3. Construit l'URL du CDN (non-officiel mais très fiable)
    return `https://img.csgostash.com/item/${encodedName}.png`;
}
// ------------------------------------

function parsePrice(priceString) {

    const cleaned = String(priceString)
        .replace('€', '')
        .replace('.', '') 
        .replace(',', '.');
    return parseFloat(cleaned);
}

function parseVolume(volumeString) {
    // Enlève les virgules ou les points des milliers
    return parseInt(String(volumeString).replace(/[,.]/g, ''));
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

async function remplirLaBase() {
    console.log('Démarrage du remplissage (avec Catégories et Images)...');
    
    let itemsPourUpsert = [];
    let itemsPourHistory = [];
    const today = getTodayDate();

    // On boucle sur notre NOUVELLE liste d'objets
    for (const skin of skins_a_suivre) {
        console.log(`Recherche du prix pour : ${skin.name}`);
        const priceData = await getSteamPrice(skin.name);
        
        if (priceData && priceData.success && priceData.lowest_price) {
            const currentPrice = parsePrice(priceData.lowest_price);
            const currentVolume = priceData.volume ? parseVolume(priceData.volume) : 0;
            
            // On génère l'URL de l'image
            const imageUrl = getImageUrl(skin.name);
            console.log(`  -> Trouvé : ${currentPrice}€, Image: ${imageUrl}`);
            
            // 1. Pour 'items' (le dernier prix + catégorie + image)
            itemsPourUpsert.push({
                name: skin.name,
                price: currentPrice,
                volume: currentVolume,
                last_updated: new Date().toISOString(),
                category: skin.category, // <-- NOUVEAU
                image_url: imageUrl       // <-- NOUVEAU
            });

            // 2. Pour 'price_history'
            itemsPourHistory.push({
                name: skin.name,
                price: currentPrice,
                entry_date: today
            });

        } else {
            console.log(`  -> Échec ou pas de données pour ${skin.name}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (itemsPourUpsert.length === 0) { /* ... (code identique) ... */ }

    // --- ENVOI A SUPABASE ---
    console.log(`Mise à jour 'items'...`);
    const { error: upsertError } = await supabase
        .from('items')
        .upsert(itemsPourUpsert, { onConflict: 'name' }); 
    
    if (upsertError) console.error('Erreur Supabase (items):', upsertError);
    else console.log('Table \'items\' mise à jour !');

    console.log(`Mise à jour 'price_history'...`);
    const { error: historyError } = await supabase
        .from('price_history')
        .upsert(itemsPourHistory, { onConflict: 'name, entry_date' });

    if (historyError) console.error('Erreur Supabase (price_history):', historyError);
    else console.log('Table \'price_history\' mise à jour !');
}

remplirLaBase();