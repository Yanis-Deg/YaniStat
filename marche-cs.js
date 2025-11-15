// On attend que TOUT le HTML soit chargé avant d'exécuter quoi que ce soit
document.addEventListener('DOMContentLoaded', (event) => {

    // --- CONFIGURATION ---
    const SUPABASE_URL = 'https://xdvqkddbfvlsnlbcmyghl.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdnFkZGJmdmxzbmxiY215Z2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTUyMDMsImV4cCI6MjA3ODUzMTIwM30.Bjbqpawz_yr6ghZ3arQXbAJ4N84Z3WiTWojJGbbyFTk';
    
    // On renomme en 'supabaseClient' pour éviter les conflits
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- ÉLÉMENTS HTML ---
    // Maintenant, c'est SÛR que ces éléments existent
    const statusElement = document.getElementById('status');
    const tableBody = document.getElementById('skin-table-body');
    let allSkins = []; // Pour garder tous les skins en mémoire

    // Filtres
    const filterSearch = document.getElementById('filter-search');
    const filterCategory = document.getElementById('filter-category');
    const filterPrice = document.getElementById('filter-price');
    const priceValue = document.getElementById('price-value');
    const filterVolume = document.getElementById('filter-volume');
    const volumeValue = document.getElementById('volume-value');

    // Modale (Pop-up)
    const modal = document.getElementById('chart-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    
    // C'est la ligne qui plantait. Elle est maintenant en sécurité.
    const modalCtx = document.getElementById('modal-chart').getContext('2d'); 
    let currentChart = null;

    // --- FONCTIONS ---

    /**
     * Prend la liste complète des skins et affiche ceux qui correspondent aux filtres
     */
    function applyFiltersAndRender() {
        const searchTerm = filterSearch.value.toLowerCase();
        const category = filterCategory.value;
        const maxPrice = parseFloat(filterPrice.value);
        const minVolume = parseInt(filterVolume.value, 10);

        const filteredSkins = allSkins.filter(skin => {
            const nameMatch = skin.name.toLowerCase().includes(searchTerm);
            const categoryMatch = (category === 'tous') || (skin.category === category);
            const priceMatch = skin.price <= maxPrice;
            const volumeMatch = skin.volume >= minVolume;
            
            return nameMatch && categoryMatch && priceMatch && volumeMatch;
        });

        renderTable(filteredSkins);
    }

    /**
     * Remplit le corps du tableau avec les skins
     */
    function renderTable(skins) {
        tableBody.innerHTML = ''; 
        if (skins.length === 0) {
            statusElement.textContent = 'Aucun skin ne correspond à vos filtres.';
            statusElement.style.display = 'block';
            return;
        }
        statusElement.style.display = 'none';

        skins.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${item.image_url}" alt="${item.name}"></td>
                <td>${item.name}</td>
                <td>${item.price.toFixed(2)}€</td>
                <td>${item.volume}</td>
                <td>${item.category}</td>
            `;
            tr.addEventListener('click', () => openChartModal(item));
            tableBody.appendChild(tr);
        });
    }

    /**
     * Ouvre la modale et dessine le graphique
     */
    async function openChartModal(item) {
        modalTitle.textContent = `Historique : ${item.name}`;
        modal.className = 'modal-visible'; 

        let { data: historyData, error } = await supabaseClient
            .from('price_history')
            .select('price, timestamp')
            .eq('name', item.name)
            .order('timestamp', { ascending: true });

        if (error || !historyData) {
            modalTitle.textContent = "Erreur de chargement de l'historique.";
            return;
        }
        
        const labels = historyData.map(point => new Date(point.timestamp).toLocaleDateString());
        const prices = historyData.map(point => point.price);

        if (currentChart) currentChart.destroy();
        currentChart = new Chart(modalCtx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Prix (€)', data: prices, borderColor: '#00c777', tension: 0.1 }] },
            options: { scales: { y: { beginAtZero: false, ticks: { callback: value => value + '€' } } } }
        });
    }

    /**
     * Ferme la modale du graphique
     */
    function closeChartModal() {
        modal.className = 'modal-hidden';
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
    }

    /**
     * Configure les filtres (catégories, échelles)
     */
    function setupFilters() {
        const categories = [...new Set(allSkins.map(skin => skin.category))];
        categories.sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filterCategory.appendChild(option);
        });

        const maxPrice = Math.ceil(Math.max(...allSkins.map(s => s.price)));
        const maxVolume = Math.ceil(Math.max(...allSkins.map(s => s.volume)));

        filterPrice.max = maxPrice;
        filterPrice.value = maxPrice;
        priceValue.textContent = `${maxPrice}€`;

        filterVolume.max = maxVolume;
        filterVolume.value = 0;
        volumeValue.textContent = `0`;

        filterSearch.addEventListener('input', applyFiltersAndRender);
        filterCategory.addEventListener('change', applyFiltersAndRender);
        
        filterPrice.addEventListener('input', () => {
            priceValue.textContent = `${filterPrice.value}€`;
            applyFiltersAndRender();
        });
        
        filterVolume.addEventListener('input', () => {
            volumeValue.textContent = `${filterVolume.value}`;
            applyFiltersAndRender();
        });

        modalCloseBtn.addEventListener('click', closeChartModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeChartModal();
        });
    }

    /**
     * Fonction de DÉMARRAGE
     */
    async function main() {
        statusElement.textContent = 'Chargement des données depuis Supabase...';
        
        let { data: items, error } = await supabaseClient
            .from('items')
            .select('*'); 

        if (error) {
            statusElement.textContent = `Erreur de chargement : ${error.message}`;
            return;
        }

        allSkins = items;
        setupFilters();
        applyFiltersAndRender();
    }

    // --- LANCE L'APPLICATION ---
    main();

}); // <-- FIN DE L'ÉCOUTEUR DOMContentLoaded