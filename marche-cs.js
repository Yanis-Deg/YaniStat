// marche-cs.js

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://xdvqddbfvlsnlbcmyghl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdnFkZGJmdmxzbmxiY215Z2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTUyMDMsImV4cCI6MjA3ODUzMTIwM30.Bjbqpawz_yr6ghZ3arQXbAJ4N84Z3WiTWojJGbbyFTk'; // <-- Mettez votre clé

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- ÉLÉMENTS HTML ---
const statusElement = document.getElementById('status');
const skinListElement = document.getElementById('skin-list');
const itemTitleElement = document.getElementById('item-title');
const itemImageElement = document.getElementById('item-image');
const searchBar = document.getElementById('search-bar'); // NOUVEAU
const ctx = document.getElementById('myChart').getContext('2d');

let currentChart = null;
let allSkins = []; // NOUVEAU : pour stocker tous les skins

// --- FONCTIONS ---

/**
 * Affiche le graphique pour un skin donné (ne change pas)
 */
async function drawChart(skinName) {
    itemTitleElement.textContent = `Chargement de ${skinName}...`;

    let { data: historyData, error } = await supabase
        .from('price_history')
        .select('price, timestamp')
        .eq('name', skinName)
        .order('timestamp', { ascending: true });

    if (error) { itemTitleElement.textContent = "Erreur."; return; }
    if (!historyData || historyData.length === 0) { itemTitleElement.textContent = "Aucun historique."; return; }
    
    itemTitleElement.textContent = skinName;
    const labels = historyData.map(point => new Date(point.timestamp).toLocaleString());
    const prices = historyData.map(point => point.price);

    if (currentChart) currentChart.destroy();

    currentChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Prix (€)', data: prices, borderColor: '#00c777' }] },
        options: { scales: { y: { beginAtZero: false, ticks: { callback: value => value + '€' } } } }
    });
}

/**
 * NOUVEAU : Génère les cartes (carrés) dans la sidebar
 * @param {Array} skinsToDisplay - La liste des skins à afficher
 */
function renderSkinList(skinsToDisplay) {
    skinListElement.innerHTML = ''; // On vide la liste

    if (skinsToDisplay.length === 0) {
        skinListElement.innerHTML = '<p style="color: #aaa;">Aucun skin trouvé.</p>';
        return;
    }

    skinsToDisplay.forEach(item => {
        // Crée la carte (le "carré")
        const card = document.createElement('div');
        card.className = 'skin-card'; // Applique le style CSS
        
        // Remplit la carte avec les infos
        card.innerHTML = `
            <img src="${item.image_url}" class="card-image" alt="${item.name}">
            <div class="card-content">
                <h3 class="card-name">${item.name}</h3>
                <p class="card-price">${item.price.toFixed(2)}€</p>
                <p class="card-volume">Volume: ${item.volume}</p>
            </div>
        `;
        
        // Ajoute le clic (comme avant)
        card.addEventListener('click', () => {
            itemImageElement.src = item.image_url;
            itemImageElement.style.display = 'block';
            drawChart(item.name);

            // Gère le style "actif"
            document.querySelectorAll('.skin-card').forEach(el => el.classList.remove('active'));
            card.classList.add('active');
        });
        
        skinListElement.appendChild(card);
    });
}

/**
 * MODIFIÉ : Charge les skins, les stocke, et gère la recherche
 */
async function loadSkinsAndSetupSearch() {
    statusElement.textContent = 'Chargement des skins...';
    
    let { data: items, error } = await supabase
        .from('items')
        .select('*') 
        .order('category', { ascending: true })
        .order('name', { ascending: true });

    if (error) { statusElement.textContent = 'Erreur DB.'; return; }
    if (items.length === 0) { statusElement.textContent = 'Aucun skin.'; return; }

    statusElement.textContent = 'Données chargées !';
    allSkins = items; // Stocke les skins dans notre variable
    
    // Affiche TOUS les skins au début
    renderSkinList(allSkins);

    // Clique sur le premier skin par défaut
    if (skinListElement.querySelector('.skin-card')) {
        skinListElement.querySelector('.skin-card').click();
    }

    // NOUVEAU : Ajoute l'écouteur pour la barre de recherche
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        // Filtre la liste des skins
        const filteredSkins = allSkins.filter(skin => 
            skin.name.toLowerCase().includes(searchTerm)
        );
        
        // Met à jour la grille avec les skins filtrés
        renderSkinList(filteredSkins);
    });
}

// --- DÉMARRAGE ---
loadSkinsAndSetupSearch();