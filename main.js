// main.js (le fichier de votre site web)

const SUPABASE_URL = 'https://xdvqddbfvlsnlbcmyghl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdnFkZGJmdmxzbmxiY215Z2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTUyMDMsImV4cCI6MjA3ODUzMTIwM30.Bjbqpawz_yr6ghZ3arQXbAJ4N84Z3WiTWojJGbbyFTk'; // <-- Mettez votre clé

const statusElement = document.getElementById('status');
const skinsListElement = document.getElementById('skins-list');
const chartTitleElement = document.getElementById('chart-title');
const ctx = document.getElementById('myChart').getContext('2d');

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let currentChart = null;

async function drawChart(skinName) {
    chartTitleElement.textContent = `Chargement de l'historique pour ${skinName}...`;

    // On lit NOTRE table d'historique
    let { data: historyData, error } = await supabase
        .from('price_history')
        .select('price, timestamp') // On a besoin du prix et de l'heure
        .eq('name', skinName)
        .order('timestamp', { ascending: true }); // On trie par heure

    if (error) { chartTitleElement.textContent = "Erreur."; return; }
    if (!historyData || historyData.length === 0) { chartTitleElement.textContent = "Aucun historique."; return; }
    
    chartTitleElement.textContent = skinName;

    // On transforme les données pour Chart.js
    const labels = historyData.map(point => new Date(point.timestamp).toLocaleString());
    const prices = historyData.map(point => point.price);

    if (currentChart) currentChart.destroy();

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Prix (€)',
                data: prices,
                borderColor: '#00c777',
                tension: 0.1
            }]
        },
        options: { scales: { y: { beginAtZero: false, ticks: { callback: value => value + '€' } } } }
    });
}

// Lit 'items' pour la liste
async function afficherLaListe() {
    statusElement.textContent = 'Recherche des prix...';
    
    let { data: items, error } = await supabase
        .from('items')
        .select('name, price')
        .order('name', { ascending: true });

    if (error) { statusElement.textContent = 'Erreur DB.'; return; }
    if (items.length === 0) { statusElement.textContent = 'Aucun skin.'; return; }

    statusElement.textContent = 'Données chargées !';
    skinsListElement.innerHTML = '';

    items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${item.name}</strong> (${item.price.toFixed(2)}€)`;
        li.addEventListener('click', () => {
            document.querySelectorAll('#skins-list li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            drawChart(item.name);
        });
        skinsListElement.appendChild(li);
    });

    if (items.length > 0) {
        skinsListElement.children[0].click();
    }
}

afficherLaListe();