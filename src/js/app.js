import maplibregl from 'maplibre-gl';
import { FilterCollection } from './FilterCollection.js';
import { filters_config } from './filters_config.js';
import { server_config } from './server_config.js';
import { buildFilterUI, buildLayerList, attachAllEventListeners } from './ui.js';
import { initMobileUI } from './mobile_ui.js'; 
import { DistanceMeasure } from './DistanceMeasure.js';
import { translations } from './translations.js'; 

const defaultPointColor = 'rgb(155, 0, 245)'; 
const highlightPointColor = 'rgb(15, 150, 36)'; 

export class App {
    constructor(map) {
        this.map = map;
        this.filterCollection = null;
        this.popup = null;
        this.lastPopupFid = null; 
        this.lastPopupCoords = null;
        this.historicalMapIds = [
            "Plan d'Adriani, 1934",
            "Plan de Tkaczow, 1993",
            "Restitution de Mahmoud bey el-Falaki, 1866"
        ];
        this.hoveredFid = null;
        this.distanceMeasure = null;
        this.injectToastStyles();
    }

    async initialize() {
        console.log('Initializing application...');
        try {
            await this.initFilters();
            this.initLayerList();
            this.initEventListeners();
            
            if (document.getElementById('mobile-unified-toggle')) {
                this.initMobile();
            }

            this.initMapClickListener();
            this.initDeepLinkHandlers();
            this.initHoverEffect(); 
            this.initDistanceMeasure();
            this.initLanguageSwitcher(); 
            
            // --- FIX: START PULSE ANIMATION HERE ---
            this.animatePulse();

            this.applyHighlightStyle(undefined); 
            console.log('Application initialized successfully.');
        } catch (error) {
            console.error("Failed to initialize the application:", error);
        }
    }

    // --- PULSE ANIMATION FUNCTION ---
    // This runs a continuous loop to animate the radius/opacity
    animatePulse() {
        const duration = 2000; // 2 seconds per beat
        let start = null;

        const frame = (time) => {
            if (!start) start = time;
            const progress = (time - start) % duration;
            const t = progress / duration; // 0 to 1

            // 1. Expanding Wave (Yellow Ring)
            // Radius: 8px -> 25px
            // Opacity: 0.8 -> 0 (Fades out)
            const radius = 8 + (17 * t);
            const opacity = 0.8 * (1 - t);

            if (this.map.getLayer('sites_fouilles-waves')) {
                this.map.setPaintProperty('sites_fouilles-waves', 'circle-radius', radius);
                this.map.setPaintProperty('sites_fouilles-waves', 'circle-opacity', opacity);
            }

            // 2. Breathing Core (Yellow Glow)
            // Radius: 6px -> 9px -> 6px
            const pulseRadius = 6 + (3 * Math.sin(t * Math.PI)); 
            if (this.map.getLayer('sites_fouilles-pulse')) {
                 this.map.setPaintProperty('sites_fouilles-pulse', 'circle-radius', pulseRadius);
            }

            requestAnimationFrame(frame);
        };

        requestAnimationFrame(frame);
    }

    initLanguageSwitcher() {
        let btn = document.getElementById('lang-switch-btn');
        if (!btn) {
            const btnHTML = `
                <div class="lang-floating-btn" id="lang-switch-btn">
                    <span class="lang-opt">FR</span>
                    <span class="lang-sep">|</span>
                    <span class="lang-opt">EN</span>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', btnHTML);
            btn = document.getElementById('lang-switch-btn');
        }

        if (btn) {
            btn.addEventListener('click', async (e) => {
                e.preventDefault(); 
                const newLang = translations.toggle();
                this.updateLanguageUI(newLang);
                
                if (this.filterCollection) {
                    await this.filterCollection.initFilters();
                    
                    buildFilterUI(this.filterCollection.getFilters());
                    this.initEventListeners();

                    if (document.getElementById('mobile-unified-toggle')) {
                        this.initMobile(); 
                    }
                }

                if (this.popup && this.lastPopupFid) {
                    this.showPopupForSite(this.lastPopupFid, this.lastPopupCoords);
                }
            });
        }
        translations.apply();
        this.updateLanguageUI(translations.currentLang);
    }

    updateLanguageUI(lang) {
        const opts = document.querySelectorAll('.lang-opt');
        opts.forEach(opt => {
            if (opt.innerText.toLowerCase() === lang) opt.classList.add('active');
            else opt.classList.remove('active');
        });
    }

    async initFilters() {
        const layerName = 'sitesFouilles';
        this.filterCollection = new FilterCollection(layerName, filters_config[layerName], server_config.api_at);
        await this.filterCollection.initFilters();
        buildFilterUI(this.filterCollection.getFilters());
    }

    initLayerList() {
        const allLayers = this.map.getStyle().layers;
        const layersForUI = allLayers.filter(layer => {
            return !(layer.metadata && layer.metadata['filter-ui'] === 'ignore');
        });
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
        const sortedLayersForUI = layersForUI.sort((a, b) => {
            const indexA = desiredOrder.indexOf(a.id);
            const indexB = desiredOrder.indexOf(b.id);
            const effectiveIndexA = (indexA === -1) ? Infinity : indexA;
            const effectiveIndexB = (indexB === -1) ? Infinity : indexB;
            return effectiveIndexA - effectiveIndexB;
        });
        buildLayerList(sortedLayersForUI, this.map, this.historicalMapIds);
    }

    initEventListeners() {
        attachAllEventListeners(
            this.filterCollection.getFilters(),
            async () => { await this.updateMapFilter(); }, 
            (layerId, isVisible) => { this.toggleLayerVisibility(layerId, isVisible); },
            (layerId, opacity) => { this.setLayerOpacity(layerId, opacity); }
        );
    }

    initMobile() {
        initMobileUI(
            this.map, 
            this.filterCollection, 
            async () => { await this.updateMapFilter(); },
            (layerId, isVisible) => { this.toggleLayerVisibility(layerId, isVisible); },
            (layerId, opacity) => { this.setLayerOpacity(layerId, opacity); }
        );
    }

    toggleLayerVisibility(layerId, isVisible) { 
        this.map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none'); 
        if (layerId === 'emprises-fill') {
            if (this.map.getLayer('emprises-line')) {
                this.map.setLayoutProperty('emprises-line', 'visibility', isVisible ? 'visible' : 'none');
            }
        }
    }

    initMapClickListener() {
        this.map.on('click', (e) => {
            if (this.distanceMeasure && this.distanceMeasure.isMeasurementActive()) return;
            const siteFeatures = this.map.queryRenderedFeatures(e.point, { layers: ['sites_fouilles-points'] });
            if (siteFeatures.length > 0) {
                if (this.popup) { this.popup.remove(); }
                const feature = siteFeatures[0];
                const coordinates = feature.geometry.coordinates.slice();
                const fid = feature.id;

                const lngStr = Number(coordinates[0]).toFixed(6);
                const latStr = Number(coordinates[1]).toFixed(6);
                const coordsStr = `${latStr}, ${lngStr}`;
                this.copyToClipboard(coordsStr);
                this.showCopyConfirmation(coordsStr);
                
                this.flyToCoordinates(coordinates, { zoom: 16, duration: 1000, padding: { top: 350 } });
                
                const onMoveEnd = () => {
                    this.map.off('moveend', onMoveEnd);
                    this.showPopupForSite(fid, coordinates);
                };
                this.map.on('moveend', onMoveEnd);
                this.updateUrlForPoint(fid);
            } else {
                const lng = e.lngLat.lng.toFixed(6);
                const lat = e.lngLat.lat.toFixed(6);
                const coords = `${lat}, ${lng}`;
                this.copyToClipboard(coords);
                this.showCopyConfirmation(coords);
                if (this.popup) { this.popup.remove(); this.popup = null; }
                this.resetUrl();
            }
        });
        this.map.on('mouseenter', 'sites_fouilles-points', () => { this.map.getCanvas().style.cursor = 'pointer'; });
        this.map.on('mouseleave', 'sites_fouilles-points', () => { this.map.getCanvas().style.cursor = ''; });
    }

    initDeepLinkHandlers() {
        const pathMatch = window.location.pathname.match(/\/carte\/(\d+)/);
        if (pathMatch && pathMatch[1]) this.focusPointByFid(pathMatch[1]);
        window.addEventListener('popstate', () => {
            const popPathMatch = window.location.pathname.match(/\/carte\/(\d+)/);
            if (popPathMatch && popPathMatch[1]) this.focusPointByFid(popPathMatch[1]);
            else if (this.popup) { this.popup.remove(); this.popup = null; }
        });
    }

    updateUrlForPoint(fid) {
        const url = new URL(`${window.location.origin}/carte/${fid}`);
        window.history.pushState({}, '', url);
    }

    resetUrl() {
        const url = new URL(`${window.location.origin}/carte`);
        window.history.pushState({}, '', url);
    }

    flyToCoordinates(coordinates, { zoom = 16, duration = 1000, padding = {} } = {}) {
        this.map.flyTo({ center: coordinates, zoom, duration, padding, curve: 1.6, easing: (t) => 1 - Math.pow(1 - t, 2) });
    }

    async focusPointByFid(fid) {
        try {
            const response = await fetch(`${server_config.api_at}/sitesFouilles/${fid}/details`);
            const data = await response.json();
        } catch (e) { console.error(e); }
    }

    initHoverEffect() {
        this.map.on('mousemove', 'sites_fouilles-points', (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                const fid = feature.id;
                const sourceId = feature.layer.source;
                const sourceLayer = feature.layer['source-layer'];
                
                if (this.hoveredFid !== fid) {
                    if (this.hoveredFid !== null) {
                        this.map.setFeatureState({ source: sourceId, sourceLayer: sourceLayer, id: this.hoveredFid }, { hover: false });
                    }
                    this.hoveredFid = fid;
                    this.map.setFeatureState({ source: sourceId, sourceLayer: sourceLayer, id: fid }, { hover: true });

                    // --- SHOW PULSE ONLY FOR HOVERED POINT ---
                    // This sets a filter so the animated layers only render at the specific FID
                    const filter = ['==', ['id'], fid];
                    if (this.map.getLayer('sites_fouilles-pulse')) this.map.setFilter('sites_fouilles-pulse', filter);
                    if (this.map.getLayer('sites_fouilles-waves')) this.map.setFilter('sites_fouilles-waves', filter);
                }
            }
        });

        this.map.on('mouseleave', 'sites_fouilles-points', () => {
            if (this.hoveredFid !== null) {
                const layers = this.map.getStyle().layers;
                const layer = layers.find(l => l.id === 'sites_fouilles-points');
                if (layer) {
                    this.map.setFeatureState({ source: layer.source, sourceLayer: layer['source-layer'], id: this.hoveredFid }, { hover: false });
                }
                this.hoveredFid = null;

                // --- HIDE PULSE ---
                // Reset filter to match nothing so it disappears
                const filter = ['==', ['id'], ''];
                if (this.map.getLayer('sites_fouilles-pulse')) this.map.setFilter('sites_fouilles-pulse', filter);
                if (this.map.getLayer('sites_fouilles-waves')) this.map.setFilter('sites_fouilles-waves', filter);
            }
        });
    }

    formatAuthors(authorString) {
        if (!authorString) return '';
        const authors = authorString.split(';');
        const formattedAuthors = authors.map(auth => {
            const parts = auth.split(',').map(s => s.trim());
            if (parts.length >= 2) {
                return `${parts[1].split(/[\s-]+/).map(n => n.charAt(0) + '.').join('-')}\u00A0${parts[0]}`; 
            }
            return parts[0];
        });
        return formattedAuthors.join(', ');
    }

    formatPages(pages) {
        if (!pages) return '';
        return /^[\d\s-]+$/.test(pages) ? `p.\u00A0${pages}` : pages;
    }

    groupVestiges(vestiges) {
        if (!vestiges || vestiges.length === 0) return [];
        const groups = {};
        vestiges.forEach(v => {
            const type = translations.get(v.caracterisation);
            let period = translations.get(v.periode);
            if (!groups[type]) { groups[type] = new Set(); }
            if (period) { groups[type].add(period); }
        });
        return Object.keys(groups).map(type => {
            const periods = Array.from(groups[type]);
            const periodStr = periods.length > 0 ? ` (${periods.join(', ')})` : '';
            return { type, text: `${type}${periodStr}` };
        });
    }

    async showPopupForSite(fid, coordinates) {
        this.lastPopupFid = fid;
        this.lastPopupCoords = coordinates;
        const currentLang = translations.currentLang;

        try {
            const response = await fetch(`${server_config.api_at}/sitesFouilles/${fid}/details?lang=${currentLang}`);
            const data = await response.json();

            const siteLabel = `${translations.get('pop-site')} ${fid}`;
            const tkaczow = data.details.num_tkaczow ? `${translations.get('pop-tkaczow')} ${data.details.num_tkaczow}` : '';
            let mainTitle = '';
            if (data.details.label && data.details.label.trim() !== '' && data.details.label !== `Site ${fid}`) {
                mainTitle = data.details.label;
            }

            const groupedVestiges = this.groupVestiges(data.vestiges);

            let html = `
                <div class="site-popup">
                    <h4>
                        <span>${siteLabel}</span>
                        <span>${tkaczow}</span>
                    </h4>
                    <div class="popup-content-body">
                        ${mainTitle ? `<h3 class="site-label-big">${mainTitle}</h3>` : ''}
                        <div class="section-popup">
                            <h5 class="section-title">${translations.get('pop-decouvertes')}</h5>
                            ${data.discoveries && data.discoveries.length > 0 ? `
                                <ul>
                                    ${data.discoveries.map(d => `
                                        <li>${translations.get(d.type_decouverte)} (${d.inventeur}, ${d.date_decouverte || '?'})</li>
                                    `).join('')}
                                </ul>
                            ` : `<p class="no-data">${translations.get('pop-no-discovery')}</p>`}
                        </div>
                        <div class="section-popup">
                            <h5 class="section-title">${translations.get('pop-vestiges')}</h5>
                            ${groupedVestiges.length > 0 ? `
                                <ul>
                                    ${groupedVestiges.map(g => `<li>${g.type}${g.text.replace(g.type, '')}</li>`).join('')}
                                </ul>
                            ` : `<p class="no-data">${translations.get('pop-unknown')}</p>`}
                        </div>
                        ${data.bibliographies && data.bibliographies.length > 0 ? `
                            <div class="section-popup">
                                <h5 class="section-title">${translations.get('pop-biblio')}</h5>
                                <ul>
                                    ${data.bibliographies.map(b => {
                                        let citation = '';
                                        const author = this.formatAuthors(b.author);
                                        const date = b.date || '';
                                        const pages = this.formatPages(b.pages);
                                        const place = b.place || '';
                                        const publisher = b.publisher || '';
                                        const title = b.title || '';
                                        const pubTitle = b.publication_title || '';
                                        const url = b.url ? `<a href="${b.url}" target="_blank" style="text-decoration:none; margin-left:4px;">&#8599;</a>` : '';
                                        if (b.item_type === 'journalArticle') {
                                            citation = `${author}, «\u00A0${title}\u00A0», <em>${pubTitle}</em>${b.volume ? ' '+b.volume : ''}${b.issue ? '/'+b.issue : ''}, ${date}, ${pages}.`;
                                        } else if (b.item_type === 'bookSection') {
                                            citation = `${author}, «\u00A0${title}\u00A0», <em>${pubTitle}</em>, ${place}, ${date}, ${pages}.`;
                                        } else if (b.item_type === 'thesis') {
                                            citation = `${author}, ${title}, ${translations.get('pop-thesis')} ${publisher}, ${place}, ${date}, ${pages}.`;
                                        } else if (b.item_type === 'webpage' || b.item_type === 'blogPost') {
                                            const access = b.access_date ? `, ${translations.get('pop-consulted')} ${b.access_date}` : '';
                                            citation = `${author}, «\u00A0${title}\u00A0», <em>${pubTitle}</em>${access} ${translations.get('pop-at-address')} ${b.url || ''}.`;
                                        } else {
                                            citation = `${author}, <em>${title}</em>, ${place}, ${date}, ${pages}.`;
                                        }
                                        citation = citation.replace(/, ,/g, ',').replace(/, \./g, '.');
                                        return `<li>${citation}${url}</li>`;
                                    }).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        <p class="uri-footer">URI: <a href="https://data.cealex.org/sites/${fid}" target="_blank">https://data.cealex.org/sites/${fid}</a></p>
                    </div>
                </div>
            `;
            if (this.popup) { this.popup.remove(); }
            this.popup = new maplibregl.Popup({ maxWidth: '450px', closeButton: true })
                .setLngLat(coordinates).setHTML(html).addTo(this.map);
        } catch (error) { console.error("Popup Error:", error); }
    }

    injectToastStyles() {
        if (document.getElementById('toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.innerHTML = `.toast-notification { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 20px; z-index: 10000; font-family: sans-serif; transition: opacity 0.3s; pointer-events: none; }`;
        document.head.appendChild(style);
    }

    copyToClipboard(text) { navigator.clipboard.writeText(text).catch(err => console.error('Error copying:', err)); }

    showCopyConfirmation(coords) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerText = `${translations.get('toast-copied')} ${coords}`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
    }

    initDistanceMeasure() { this.distanceMeasure = new DistanceMeasure(this.map); }

    setLayerOpacity(layerId, opacity) {
        const layers = this.map.getStyle().layers;
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return;
        const type = layer.type;
        const prop = type === 'raster' ? 'raster-opacity' : (type === 'fill' ? 'fill-opacity' : 'circle-opacity');
        this.map.setPaintProperty(layerId, prop, opacity);
    }

    applyHighlightStyle(filteredIds) {
        const layerId = 'sites_fouilles-points';
        let colorExpression = defaultPointColor;
        if (filteredIds && filteredIds.length > 0) {
            const literalIds = filteredIds.map(id => isNaN(Number(id)) ? String(id) : Number(id));
            colorExpression = ['case', ['in', ['id'], ['literal', literalIds]], highlightPointColor, defaultPointColor];
        }
        try { this.map.setPaintProperty(layerId, 'circle-color', colorExpression); } catch (e) {}
    }

    async updateMapFilter() {
        const activeFilters = this.filterCollection.getActiveFilters();
        if (activeFilters.length === 0) {
            this.map.setFilter('sites_fouilles-points', null);
            this.applyHighlightStyle(undefined);
        } else {
            const filteredIds = await this.filterCollection.getFilteredIds();
            if (filteredIds && filteredIds.length > 0) {
                const literalIds = filteredIds.map(id => isNaN(Number(id)) ? String(id) : Number(id));
                this.map.setFilter('sites_fouilles-points', ['in', ['id'], ['literal', literalIds]]);
                this.applyHighlightStyle(filteredIds);
            } else {
                this.map.setFilter('sites_fouilles-points', ['in', ['id'], '']); 
                this.applyHighlightStyle([]);
            }
        }
    }
}