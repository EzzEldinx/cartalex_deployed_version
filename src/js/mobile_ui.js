import { translations } from './translations.js';

// --- 1. FILTER BUILDER ---
export function buildFilterUI(filters) {
    if (!document.getElementById('mobile-unified-toggle')) return;

    const container = document.querySelector('#volet_haut .sheet-content') || document.getElementById('volet_haut');
    if (!container) return;

    let html = '<div id="filter-container" class="filter-collection-content">';
    let uniqueId = 0;

    for (const filterName in filters) {
        const filter = filters[filterName];
        const catName = translations.get(filter.displayName);
        const catKey = `cat-${filter.name}`;

        html += `<div class="filter-content" data-filter-name="${filter.name}">
            <div class="filter-name" data-i18n="${catKey}">${catName}</div>`;
        
        for (const sub of filter.getSubFilters()) {
            const subName = translations.get(sub.displayName);
            const subKey = `sub-${sub.name}`;

            html += `<div class="subfilter-wrapper">
                <div class="subfilter-title" data-sub-name="${sub.name}">
                    <span data-i18n="${subKey}">${subName}</span>
                    <i class="fas fa-chevron-down" style="float: right; transition: transform 0.3s;"></i>
                </div>
                <ul class="subfilter-content" style="display: none;">`;
            
            if (sub.isNumeric) {
                const pStart = translations.get('lbl-date-start');
                const pEnd = translations.get('lbl-date-end');
                const lblApply = translations.get('lbl-apply');

                html += `<li class="numeric-inputs">
                    <div class="num-row" style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <input type="number" class="num-floor" placeholder="${pStart}">
                        <input type="number" class="num-ceil" placeholder="${pEnd}">
                    </div>
                    <label class="num-apply-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <span data-i18n="lbl-apply">${lblApply}</span>
                        <input type="checkbox" class="num-apply">
                    </label>
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
                        <input type="checkbox" id="m-chk-${uniqueId}" value="${cleanVal}" name="${sub.name}">
                        <label for="m-chk-${uniqueId}">${displayVal}</label>
                    </li>`;
                });
            }
            html += `</ul></div>`;
        }
        html += `</div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// --- 2. LAYER LIST BUILDER (FIXED SORTING) ---
export function buildLayerList(layers, map, historicalMapIds = []) {
    if (!document.getElementById('mobile-unified-toggle')) return;

    const container = document.getElementById('items');
    if (!container) return;

    // Defined Order (Same as Desktop)
    const desiredOrder = [
        'sites_fouilles-points',
        'emprises-fill',
        'littoral-line',
        'parcelles_region-fill',
        'Plan de Tkaczow, 1993',
        "Plan d'Adriani, 1934",
        'Restitution de Mahmoud bey el-Falaki, 1866',
        'satellite-background',
        'osm-background'
    ];

    const defaultNames = { 
        'osm-background': 'OpenStreetMap', 
        'satellite-background': 'Google Earth',
        'sites_fouilles-points': 'Découvertes archéologiques'
    };

    let html = '';
    
    // Create a map of layers for easy access
    const layerMap = new Map(layers.map(l => [l.id, l]));

    // Iterate in the DESIRED ORDER
    desiredOrder.forEach(layerId => {
        const layer = layerMap.get(layerId);
        if (!layer) return; // Skip if layer doesn't exist in map

        const layerKey = `layer-${layer.id}`;
        let displayName = translations.get(layerKey);
        if (displayName === layerKey) {
             displayName = defaultNames[layer.id] || layer.id.replace(/-/g, ' ');
        }

        const isVisible = map.getLayoutProperty(layer.id, 'visibility') !== 'none';
        
        html += `<li class="listitem">
            <div class="listitem-header" style="display: flex; align-items: center;">
                <input type="checkbox" id="mob-layer-${layer.id}" data-layer-id="${layer.id}" ${isVisible ? 'checked' : ''} style="margin-right: 10px;">
                <label for="mob-layer-${layer.id}" data-i18n="${layerKey}">${displayName}</label>
            </div>`;
        
        if (layer.id.includes('Plan') || layer.id === 'Restitution de Mahmoud bey el-Falaki, 1866' || layer.id === 'parcelles_region-fill') {
            html += `
                <div class="slider-container" style="display: ${isVisible ? 'block' : 'none'}; margin-top: 8px;">
                    <span class="slider-label" style="font-size: 0.8em; opacity: 0.8;">Opacité</span>
                    <input type="range" class="opacity-slider" data-layer-id="${layer.id}" min="0" max="100" value="100" style="width: 100%;">
                </div>`;
        }
        html += `</li>`;
    });

    container.innerHTML = html;
    translations.apply();
}

// --- 3. LISTENERS ---
export function attachAllEventListeners(filters, onFilterChange, onLayerToggle, onOpacityChange) {
    const menuBtn = document.getElementById('mobile-unified-toggle');
    if (!menuBtn) return; 

    const menuOverlay = document.getElementById('mobile-menu-overlay');
    const closeMenuBtn = document.getElementById('close-mobile-menu');
    const filterSheet = document.getElementById('volet_haut');
    const layerSheet = document.getElementById('volet_gauche');

    if(menuBtn) menuBtn.addEventListener('click', () => menuOverlay.classList.add('is-visible'));
    if(closeMenuBtn) closeMenuBtn.addEventListener('click', () => menuOverlay.classList.remove('is-visible'));

    const optFilters = document.getElementById('mob-opt-filters');
    if(optFilters) optFilters.addEventListener('click', () => {
        menuOverlay.classList.remove('is-visible');
        filterSheet.classList.add('is-open');
    });

    const optLayers = document.getElementById('mob-opt-layers');
    if(optLayers) optLayers.addEventListener('click', () => {
        menuOverlay.classList.remove('is-visible');
        layerSheet.classList.add('is-open');
    });

    document.querySelectorAll('.panel-close-x').forEach(btn => {
        btn.addEventListener('click', () => {
            filterSheet.classList.remove('is-open');
            layerSheet.classList.remove('is-open');
        });
    });

    const container = document.getElementById('filter-container');
    if (!container) return; 

    container.querySelectorAll('.subfilter-title').forEach(t => {
        t.addEventListener('click', () => {
            const content = t.nextElementSibling;
            if (content) {
                const icon = t.querySelector('i');
                const isVisible = content.style.display === 'block';
                const parent = t.closest('.filter-content');
                if (parent) {
                    parent.querySelectorAll('.subfilter-content').forEach(c => c.style.display = 'none');
                    parent.querySelectorAll('.subfilter-title i').forEach(i => i.style.transform = "rotate(0deg)");
                }
                content.style.display = isVisible ? 'none' : 'block';
                if(icon) icon.style.transform = isVisible ? "rotate(0deg)" : "rotate(180deg)";
            }
        });
    });

    container.querySelectorAll('.subfilter-content input[type="checkbox"]').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const filterName = e.target.closest('.filter-content').dataset.filterName;
            const subName = e.target.closest('.subfilter-wrapper').querySelector('.subfilter-title').dataset.subName;
            const filter = filters[filterName];
            const sub = filter.getSubFilter(subName);
            if (e.target.checked) sub.checkValue(e.target.value); else sub.unCheckValue(e.target.value);
            filter.active = true;
            onFilterChange();
        });
    });

    container.querySelectorAll('.numeric-inputs').forEach(el => {
        const floorInput = el.querySelector('.num-floor');
        const ceilInput = el.querySelector('.num-ceil');
        const applyChk = el.querySelector('.num-apply');
        
        if (!floorInput || !ceilInput || !applyChk) return;
        const content = el.closest('.filter-content');
        if (!content) return;
        const wrapper = el.closest('.subfilter-wrapper');
        if (!wrapper) return;
        const titleEl = wrapper.querySelector('.subfilter-title');
        if (!titleEl) return;

        const filterName = content.dataset.filterName;
        const subName = titleEl.dataset.subName;
        const filter = filters[filterName];
        if (filter) {
            const sub = filter.getSubFilter(subName);
            if (sub) {
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
            }
        }
    });

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

    const resetBtn = document.getElementById('btn-reset-filters');
    if(resetBtn) {
        resetBtn.addEventListener('click', () => {
            container.querySelectorAll('.subfilter-content input:checked').forEach(c => c.checked = false);
            container.querySelectorAll('.numeric-inputs input[type="number"]').forEach(i => i.value = '');
            container.querySelectorAll('.numeric-inputs input[type="checkbox"]').forEach(c => c.checked = false);
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

// --- 4. MAIN INIT WRAPPER ---
export function initMobileUI(map, filterCollection, onFilterChange, onLayerToggle, onOpacityChange) {
    if (!document.getElementById('mobile-unified-toggle')) return;

    buildFilterUI(filterCollection.getFilters());
    buildLayerList(map.getStyle().layers, map);
    attachAllEventListeners(filterCollection.getFilters(), onFilterChange, onLayerToggle, onOpacityChange);
}