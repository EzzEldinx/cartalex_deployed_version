import { translations } from './translations.js';

// --- DESKTOP FILTER BUILDER ---
export function buildFilterUI(filters) {
    // GUARD: If mobile toggle exists, do NOT build desktop UI here (Mobile_UI handles it)
    if (document.getElementById('mobile-unified-toggle')) return;

    const container = document.getElementById('volet_haut');
    if (!container) return;

    // Use a specific ID for Desktop to avoid CSS conflicts with Mobile
    let html = '<div id="desktop-filter-container" class="filter-collection-content">';
    let uniqueId = 0;

    for (const filterName in filters) {
        const filter = filters[filterName];
        const catName = translations.get(filter.displayName);
        const catKey = `cat-${filter.name}`;

        html += `<div class="filter-content" data-filter-name="${filter.name}">
            <div class="filter-name" data-i18n="${catKey}">${catName}</div>
            <div class="subfilter-container">`; // Container for subfilters
        
        for (const sub of filter.getSubFilters()) {
            const subName = translations.get(sub.displayName);
            const subKey = `sub-${sub.name}`;

            html += `<div class="subfilter-content-wrapper">
                <div class="subfilter-title" data-subfilter-name="${sub.name}" style="cursor: pointer;">
                    <span data-i18n="${subKey}">${subName}</span>
                    <i class="fas fa-chevron-down" style="float: right; margin-top: 3px; transition: transform 0.3s;"></i>
                </div>
                <ul class="subfilter-content" style="display: none;">`; // Hidden by default
            
            if (sub.isNumeric) {
                const pStart = translations.get('lbl-date-start');
                const pEnd = translations.get('lbl-date-end');
                const lblApply = translations.get('lbl-apply');

                html += `<li class="numeric-filter-inputs">
                    <div style="display:flex; gap:5px; margin-bottom:5px;">
                        <input type="number" class="numeric-input-floor" placeholder="${pStart}" style="width: 48%;">
                        <input type="number" class="numeric-input-ceil" placeholder="${pEnd}" style="width: 48%;">
                    </div>
                    <div style="display:flex; align-items:center;">
                        <input type="checkbox" class="numeric-apply-checkbox" id="desk-num-${sub.name}">
                        <label for="desk-num-${sub.name}" style="margin-left:5px; cursor: pointer;">${lblApply}</label>
                    </div>
                </li>`;
            } else {
                sub.getValues().forEach(val => {
                    uniqueId++;
                    const cleanVal = val.internalValue.replace(/"/g, '&quot;');
                    
                    let displayVal = val.displayValue;
                    const translated = translations.get(displayVal);
                    if (translated === displayVal) {
                        displayVal = translations.get(displayVal.toLowerCase());
                    } else {
                        displayVal = translated;
                    }

                    html += `<li>
                        <input type="checkbox" id="desk-chk-${uniqueId}" value="${cleanVal}" name="${sub.name}">
                        <label for="desk-chk-${uniqueId}" style="cursor: pointer;">${displayVal}</label>
                    </li>`;
                });
            }
            html += `</ul></div>`;
        }
        html += `</div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// --- DESKTOP LAYER LIST ---
export function buildLayerList(layers, map, historicalMapIds = []) {
    // GUARD: If mobile toggle exists, stop.
    if (document.getElementById('mobile-unified-toggle')) return;

    const container = document.getElementById('items');
    if (!container) return;

    const hiddenLayerIds = ['sites_fouilles-pulse', 'sites_fouilles-waves'];
    const defaultNames = { 
        'osm-background': 'OpenStreetMap', 
        'satellite-background': 'Google Earth',
        'sites_fouilles-points': 'Découvertes archéologiques'
    };

    let html = '';
    
    layers.forEach(layer => {
        if (hiddenLayerIds.includes(layer.id)) return;

        const layerKey = `layer-${layer.id}`;
        let displayName = translations.get(layerKey);
        if (displayName === layerKey) {
             displayName = defaultNames[layer.id] || layer.id.replace(/-/g, ' ');
        }

        const isVisible = map.getLayoutProperty(layer.id, 'visibility') !== 'none';
        
        html += `<li class="listitem">
            <input type="checkbox" id="layer-${layer.id}" data-layer-id="${layer.id}" ${isVisible ? 'checked' : ''}>
            <label for="layer-${layer.id}" data-i18n="${layerKey}">${displayName}</label>`;
        
        if (historicalMapIds.includes(layer.id) || layer.id === 'parcelles_region-fill') {
            html += `
                <div class="slider-container" style="display: ${isVisible ? 'block' : 'none'}; padding-left: 20px;">
                    <input type="range" class="opacity-slider" data-layer-id="${layer.id}" min="0" max="100" value="100">
                </div>`;
        }
        html += `</li>`;
    });

    container.innerHTML = html;
    translations.apply();
}

// --- DESKTOP EVENT LISTENERS ---
export function attachAllEventListeners(filters, onFilterChange, onLayerToggle, onOpacityChange) {
    // GUARD: If mobile toggle exists, stop.
    if (document.getElementById('mobile-unified-toggle')) return;

    // 1. Panel Toggles (Top & Left)
    const voletHaut = document.getElementById('volet_haut');
    const openFilterBtn = document.querySelector('.onglets_haut .ouvrir');
    const closeFilterBtn = document.querySelector('.onglets_haut .fermer');

    if (voletHaut && openFilterBtn && closeFilterBtn) {
        openFilterBtn.onclick = (e) => { e.preventDefault(); voletHaut.classList.add('is-open'); };
        closeFilterBtn.onclick = (e) => { e.preventDefault(); voletHaut.classList.remove('is-open'); };
    }

    const voletGauche = document.getElementById('volet_gauche');
    // Fallback for getting the left tabs container if ID is missing
    const voletGaucheClos = document.querySelector('.onglets_gauche') ? document.querySelector('.onglets_gauche').parentElement : document.body;
    const openLayerBtn = document.querySelector('.onglets_gauche .ouvrir');
    const closeLayerBtn = document.querySelector('.onglets_gauche .fermer');

    if (voletGauche && openLayerBtn && closeLayerBtn) {
        openLayerBtn.onclick = (e) => { e.preventDefault(); voletGauche.classList.add('is-open'); };
        closeLayerBtn.onclick = (e) => { e.preventDefault(); voletGauche.classList.remove('is-open'); };
    }

    // 2. Accordion Logic (The Expand/Collapse Fix)
    const container = document.getElementById('desktop-filter-container');
    if (container) {
        container.querySelectorAll('.subfilter-title').forEach(title => {
            title.addEventListener('click', () => {
                const content = title.nextElementSibling;
                const icon = title.querySelector('i');
                
                if (content.style.display === 'none') {
                    // Close siblings (Optional: makes UI cleaner)
                    const parent = title.closest('.filter-content');
                    if (parent) {
                        parent.querySelectorAll('.subfilter-content').forEach(c => c.style.display = 'none');
                        parent.querySelectorAll('.subfilter-title i').forEach(i => i.style.transform = 'rotate(0deg)');
                    }

                    content.style.display = 'block';
                    if (icon) icon.style.transform = 'rotate(180deg)';
                } else {
                    content.style.display = 'none';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                }
            });
        });

        // 3. Checkboxes
        container.querySelectorAll('input[type="checkbox"]:not(.numeric-apply-checkbox)').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const filterName = e.target.closest('.filter-content').dataset.filterName;
                const subName = e.target.closest('.subfilter-content-wrapper').querySelector('.subfilter-title').dataset.subfilterName;
                
                const filter = filters[filterName];
                const sub = filter.getSubFilter(subName);
                
                if (e.target.checked) sub.checkValue(e.target.value); 
                else sub.unCheckValue(e.target.value);
                
                filter.active = true;
                onFilterChange();
            });
        });

        // 4. Numeric Inputs
        container.querySelectorAll('.numeric-filter-inputs').forEach(el => {
            const floorInput = el.querySelector('.numeric-input-floor');
            const ceilInput = el.querySelector('.numeric-input-ceil');
            const applyChk = el.querySelector('.numeric-apply-checkbox');
            
            const filterName = el.closest('.filter-content').dataset.filterName;
            const subName = el.closest('.subfilter-content-wrapper').querySelector('.subfilter-title').dataset.subfilterName;
            
            const filter = filters[filterName];
            const sub = filter.getSubFilter(subName);

            const update = () => {
                sub.setFloor(floorInput.value || '');
                sub.setCeil(ceilInput.value || '');
                sub.setEnabled(applyChk.checked);
                filter.active = true;
                onFilterChange();
            };
            floorInput.addEventListener('input', update);
            ceilInput.addEventListener('input', update);
            applyChk.addEventListener('change', update);
        });
    }

    // 5. Layer Toggles (Desktop List)
    const itemsContainer = document.getElementById('items');
    if (itemsContainer) {
        itemsContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', (e) => {
                onLayerToggle(e.target.dataset.layerId, e.target.checked);
                const slider = e.target.closest('.listitem').querySelector('.slider-container');
                if(slider) slider.style.display = e.target.checked ? 'block' : 'none';
            });
        });
        itemsContainer.querySelectorAll('.opacity-slider').forEach(range => {
            range.addEventListener('input', (e) => {
                onOpacityChange(e.target.dataset.layerId, e.target.value / 100);
            });
        });
    }

    // 6. Reset Button
    const resetBtn = document.getElementById('btn-reset-filters');
    if(resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (container) {
                container.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
                container.querySelectorAll('input[type="number"]').forEach(i => i.value = '');
            }
            
            for (const name in filters) {
                const filter = filters[name];
                filter.active = false;
                for (const sub of filter.getSubFilters()) {
                    if (sub.isNumeric) { sub.setFloor(''); sub.setCeil(''); sub.setEnabled(false); } 
                    else { if (sub.activeValues) sub.activeValues.clear(); if (sub.checkedValues) sub.checkedValues = []; }
                }
            }
            onFilterChange();
        });
    }
}