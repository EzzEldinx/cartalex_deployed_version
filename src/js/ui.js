import { translations } from './translations.js';

export function buildFilterUI(filters) {
  const container = document.getElementById('volet_haut');
  if (!container) return;

  const currentLang = translations.currentLang;
  let html = '<div class="filter-collection-content">';
  let uniqueIdCounter = 0;

  for (const filterName in filters) {
    const filter = filters[filterName];
    const catKey = `cat-${filter.name}`; 
    
    html += `
      <div class="filter-content" data-filter-name="${filter.name}">
        <h3 class="filter-name" data-i18n="${catKey}">${filter.displayName}</h3>
        <div class="subfilter-container">
    `;
    for (const subFilter of filter.getSubFilters()) {
      const subKey = `sub-${subFilter.name}`;
      html += `
        <div class="subfilter-content-wrapper">
          <h4 class="subfilter-title" data-subfilter-name="${subFilter.name}" data-i18n="${subKey}">${subFilter.displayName}</h4>
          <ul class="subfilter-content">
      `;
      if (subFilter.isNumeric) {
        const idPrefix = `${filter.name}-${subFilter.name}`;
        html += `
          <li class="numeric-filter-inputs">
            <div><label for="${idPrefix}-floor" data-i18n="lbl-date-start">Start:</label><input type="number" id="${idPrefix}-floor" class="numeric-input-floor"></div>
            <div><label for="${idPrefix}-ceil" data-i18n="lbl-date-end">End:</label><input type="number" id="${idPrefix}-ceil" class="numeric-input-ceil"></div>
            <div><label for="${idPrefix}-apply" data-i18n="lbl-apply">Apply:</label><input type="checkbox" id="${idPrefix}-apply" class="numeric-apply-checkbox"></div>
          </li>`;
      } else {
        subFilter.getValues().forEach(valueObj => {
          let displayValue = valueObj.displayValue;
          // Apply dynamic label if English is selected
          if (subFilter.name === 'caracterisation' && currentLang === 'en' && valueObj.labelEn) {
            displayValue = valueObj.labelEn;
          }
          uniqueIdCounter++;
          const inputId = `filter-checkbox-${uniqueIdCounter}`;
          html += `<li><input type="checkbox" id="${inputId}" name="${subFilter.name}" value="${valueObj.internalValue}" ${subFilter.isChecked(valueObj.internalValue) ? 'checked' : ''}><label for="${inputId}">${displayValue}</label></li>`;
        });
      }
      html += `</ul></div>`;
    }
    html += `</div></div>`;
  }
  html += '</div>';
  container.innerHTML = html;
  translations.apply();
}

// ... attachAllEventListeners logic remains standard, using delegation to handle UI rebuilds ...

export function buildLayerList(layers, map, historicalMapIds = []) {
  const container = document.getElementById('items');
  if (!container) return;

  const hiddenLayerIds = ['sites_fouilles-pulse', 'sites_fouilles-waves'];
  const defaultNames = { 'osm-background': 'OpenStreetMap', 'satellite-background': 'Google Earth' };

  let html = '';
  layers.forEach(layer => {
    if (hiddenLayerIds.includes(layer.id)) return;
    const layerKey = `layer-${layer.id}`;
    const fallbackName = defaultNames[layer.id] || layer.id.replace(/-/g, ' ');
    const isVisible = map.getLayoutProperty(layer.id, 'visibility') !== 'none';
    const checkedAttribute = isVisible ? 'checked' : '';
    
    html += `
      <li class="listitem">
        <input type="checkbox" id="layer-${layer.id}" data-layer-id="${layer.id}" ${checkedAttribute}>
        <label for="layer-${layer.id}" data-i18n="${layerKey}">${fallbackName}</label>`;
    
    if (historicalMapIds.includes(layer.id) || layer.id === 'parcelles_region-fill') {
      html += `
        <div class="slider-container" style="display: ${isVisible ? 'block' : 'none'};">
          <input type="range" min="0" max="100" value="100" class="opacity-slider" data-layer-id="${layer.id}">
        </div>`;
    }
    html += `</li>`;
  });
  container.innerHTML = html;
  translations.apply();
}

export function attachAllEventListeners(filters, onFilterChangeCallback, onLayerToggleCallback, onOpacityChangeCallback) {
  const voletHaut = document.getElementById('volet_haut');
  const openFilterBtn = document.querySelector('.onglets_haut a.ouvrir');
  const closeFilterBtn = document.querySelector('.onglets_haut a.fermer');

  if (voletHaut && openFilterBtn && closeFilterBtn) {
    openFilterBtn.addEventListener('click', (e) => { e.preventDefault(); voletHaut.classList.add('is-open'); });
    closeFilterBtn.addEventListener('click', (e) => { e.preventDefault(); voletHaut.classList.remove('is-open'); });
  }

  const topResetBtn = document.getElementById('btn-reset-filters');
  if (topResetBtn) {
      topResetBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const checkboxes = voletHaut.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach(checkbox => {
              if (checkbox.checked) {
                  checkbox.checked = false;
                  const filterContent = checkbox.closest('.filter-content');
                  const wrapper = checkbox.closest('.subfilter-content-wrapper');
                  if (filterContent && wrapper) {
                      const filterName = filterContent.dataset.filterName;
                      const subFilterName = wrapper.querySelector('.subfilter-title').dataset.subfilterName;
                      const filter = filters[filterName];
                      const subFilter = filter ? filter.getSubFilter(subFilterName) : null;
                      if (filter && subFilter) {
                          if (checkbox.classList.contains('numeric-apply-checkbox')) { subFilter.setEnabled(false); } 
                          else { subFilter.unCheckValue(checkbox.value); }
                      }
                  }
              }
          });
          const numberInputs = voletHaut.querySelectorAll('input[type="number"]');
          numberInputs.forEach(input => { input.value = ''; });
          onFilterChangeCallback();
      });
  }

  const voletGauche = document.getElementById('volet_gauche');
  const openLayerBtn = document.querySelector('#volet_gauche_clos .ouvrir');
  const closeLayerBtn = document.querySelector('#volet_gauche_clos .fermer');
  if (voletGauche && openLayerBtn && closeLayerBtn) {
    openLayerBtn.addEventListener('click', (e) => { e.preventDefault(); voletGauche.classList.add('is-open'); });
    closeLayerBtn.addEventListener('click', (e) => { e.preventDefault(); voletGauche.classList.remove('is-open'); });
  }

  // Use event delegation for dynamically rebuilt filter contents
  voletHaut.addEventListener('click', (e) => {
    if (e.target.classList.contains('subfilter-title')) {
        const title = e.target;
        const content = title.nextElementSibling;
        const isActive = title.classList.contains('active');
        title.closest('.subfilter-container').querySelectorAll('.subfilter-content').forEach(c => { if (c !== content) c.style.display = 'none'; });
        title.closest('.subfilter-container').querySelectorAll('.subfilter-title').forEach(t => { if (t !== title) t.classList.remove('active'); });
        if (!isActive) { content.style.display = 'block'; title.classList.add('active'); } 
        else { content.style.display = 'none'; title.classList.remove('active'); }
    }
  });

  voletHaut.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && !e.target.classList.contains('numeric-apply-checkbox')) {
      const checkbox = e.target;
      const filterContent = checkbox.closest('.filter-content');
      const subfilterWrapper = checkbox.closest('.subfilter-content-wrapper');
      if (!filterContent || !subfilterWrapper) return;
      
      const filterName = filterContent.dataset.filterName;
      const subFilterName = subfilterWrapper.querySelector('.subfilter-title').dataset.subfilterName;
      const filter = filters[filterName];
      if (!filter) return;
      const subFilter = filter.getSubFilter(subFilterName);
      if (!subFilter) return;
      
      if (checkbox.checked) subFilter.checkValue(checkbox.value);
      else subFilter.unCheckValue(checkbox.value);
      filter.active = filter.getActiveSubFilters().length > 0;
      onFilterChangeCallback();
    }
  });

  voletHaut.addEventListener('input', (e) => {
    if (e.target.classList.contains('numeric-input-floor') || e.target.classList.contains('numeric-input-ceil')) {
        updateNumericFilter(e.target);
    }
  });
  voletHaut.addEventListener('change', (e) => {
    if (e.target.classList.contains('numeric-apply-checkbox')) {
        updateNumericFilter(e.target);
    }
  });

  function updateNumericFilter(el) {
    const wrapper = el.closest('.subfilter-content-wrapper');
    const filterContent = el.closest('.filter-content');
    const filterName = filterContent.dataset.filterName;
    const subFilterName = wrapper.querySelector('.subfilter-title').dataset.subfilterName;
    const filter = filters[filterName];
    const subFilter = filter.getSubFilter(subFilterName);
    
    const floorInput = wrapper.querySelector('.numeric-input-floor');
    const ceilInput = wrapper.querySelector('.numeric-input-ceil');
    const applyCheckbox = wrapper.querySelector('.numeric-apply-checkbox');

    subFilter.setFloor(floorInput.value || '');
    subFilter.setCeil(ceilInput.value || '');
    subFilter.setEnabled(applyCheckbox.checked);
    filter.active = filter.getActiveSubFilters().length > 0;
    onFilterChangeCallback();
  }

  document.querySelectorAll('#items input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const layerId = e.target.dataset.layerId;
      const isVisible = e.target.checked;
      onLayerToggleCallback(layerId, isVisible);
      const sliderContainer = e.target.closest('.listitem').querySelector('.slider-container');
      if (sliderContainer) sliderContainer.style.display = isVisible ? 'block' : 'none';
    });
  });

  document.querySelectorAll('.opacity-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      onOpacityChangeCallback(e.target.dataset.layerId, parseInt(e.target.value, 10) / 100);
    });
  });
}