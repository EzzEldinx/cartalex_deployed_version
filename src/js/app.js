import maplibregl from 'maplibre-gl';
import { FilterCollection } from './FilterCollection.js';
import { filters_config } from './filters_config.js';
import { server_config } from './server_config.js';
import { buildFilterUI, buildLayerList, attachAllEventListeners } from './ui.js';
import { DistanceMeasure } from './DistanceMeasure.js';
import { translations } from './translations.js'; // Import Translations

const defaultPointColor = 'rgb(155, 0, 245)'; 
const highlightPointColor = 'rgb(15, 150, 36)'; 

export class App {
    constructor(map) {
        this.map = map;
        this.filterCollection = null;
        this.popup = null;
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
            this.initMapClickListener();
            this.initDeepLinkHandlers();
            this.initHoverEffect();
            this.initDistanceMeasure();
            this.initLanguageSwitcher(); // <--- Init Switcher
            
            this.applyHighlightStyle(undefined); 
            console.log('Application initialized successfully.');
        } catch (error) {
            console.error("Failed to initialize the application:", error);
        }
    }

    // --- LANGUAGE SWITCHER LOGIC ---
    initLanguageSwitcher() {
        const btn = document.getElementById('lang-switch-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                const newLang = translations.toggle();
                this.updateLanguageUI(newLang);
                // Force popup refresh if open
                if (this.popup && this.lastPopupFid) {
                    this.showPopupForSite(this.lastPopupFid, this.lastPopupCoords);
                }
            });
        }
        // Initial Translation Apply
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

    // ... (initFilters, initLayerList, initEventListeners, initMapClickListener... same as before) ...
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
        this.map.flyTo({ 
            center: coordinates, 
            zoom, 
            duration, 
            padding,
            curve: 1.6, 
            easing: (t) => 1 - Math.pow(1 - t, 2) 
        });
    }

    async focusPointByFid(fid) {
        try {
            const coords = await this.getCoordinatesForFid(fid);
            if (!coords) { console.warn(`Could not find coordinates for fid: ${fid}`); return; }
            this.flyToCoordinates(coords, { zoom: 16, duration: 1000, padding: { top: 350 } });
            const onMoveEnd = () => {
                this.map.off('moveend', onMoveEnd);
                this.showPopupForSite(fid, coords);
            };
            this.map.on('moveend', onMoveEnd);
        } catch (e) { console.error('Failed to focus point by fid', fid, e); }
    }

    async getCoordinatesForFid(targetFid) {
        const tryFind = () => {
            const features = this.map.querySourceFeatures('tegola_points', { sourceLayer: 'sites_fouilles' }) || [];
            for (const f of features) {
                if (String(f.id) === String(targetFid)) {
                    return f.geometry.coordinates.slice();
                }
            }
            return null;
        };
        let found = tryFind();
        if (found) return found;
        const maxAttempts = 5;
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => {
                const handler = () => { this.map.off('idle', handler); resolve(); };
                this.map.on('idle', handler);
            });
            found = tryFind();
            if (found) return found;
        }
        return null;
    }

    initHoverEffect() {
        this.map.on('mousemove', 'sites_fouilles-points', (e) => {
            if (e.features.length > 0) {
                const currentFid = e.features[0].id;
                if (this.hoveredFid !== currentFid) {
                    if (this.hoveredFid !== null) {
                        this.map.setFeatureState({ source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid }, { hover: false });
                    }
                    this.hoveredFid = currentFid;
                    this.map.setFeatureState({ source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid }, { hover: true });
                }
            }
        });
        this.map.on('mouseleave', 'sites_fouilles-points', () => {
            if (this.hoveredFid !== null) {
                this.map.setFeatureState({ source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid }, { hover: false });
            }
            this.hoveredFid = null;
        });
        this.animateHoverEffect();
    }

    animateHoverEffect() {
        const radius = 6;
        const maxRadius = 15;
        let frame = 0;
        const animate = (timestamp) => {
            if (this.hoveredFid !== null) {
                const filter = ['==', ['id'], this.hoveredFid];
                this.map.setFilter('sites_fouilles-pulse', filter);
                this.map.setFilter('sites_fouilles-waves', filter);
                const pulseRadius = radius + Math.sin(timestamp / 300) * 1.5;
                this.map.setPaintProperty('sites_fouilles-pulse', 'circle-radius', pulseRadius);
                const waveRadius = (frame % maxRadius) + radius;
                const waveOpacity = 1 - (waveRadius / (maxRadius + radius));
                this.map.setPaintProperty('sites_fouilles-waves', 'circle-radius', waveRadius);
                this.map.setPaintProperty('sites_fouilles-waves', 'circle-opacity', waveOpacity > 0 ? waveOpacity : 0);
                frame += 0.3;
            } else {
                const nullFilter = ['==', ['id'], ''];
                this.map.setFilter('sites_fouilles-pulse', nullFilter);
                this.map.setFilter('sites_fouilles-waves', nullFilter);
                frame = 0;
            }
            requestAnimationFrame(animate);
        }
        animate(0);
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

    // --- UPDATED POPUP LOGIC FOR TRANSLATION ---
    async showPopupForSite(fid, coordinates) {
        this.lastPopupFid = fid;
        this.lastPopupCoords = coordinates;

        try {
            const response = await fetch(`${server_config.api_at}/sitesFouilles/${fid}/details`);
            if (!response.ok) throw new Error(`API request failed for fid: ${fid}`);
            const data = await response.json();

            const details = data.details || {};
            const tkaczow = details.num_tkaczow ? `${translations.get('pop-tkaczow')}\u00A0${details.num_tkaczow}` : '';
            
            // --- TRANSLATED DISCOVERY SECTION ---
            let discoveryHTML = '';
            if (data.discoveries && data.discoveries.length > 0) {
                discoveryHTML = `<ul style="margin: 5px 0; padding-left: 20px;">` + data.discoveries.map(d => {
                    const extra = [d.date_decouverte, d.type_decouverte].filter(Boolean).join(', ');
                    return `<li>${d.inventeur || translations.get('pop-unknown')}${extra ? ` (${extra})` : ''}</li>`;
                }).join('') + `</ul>`;
            } else {
                discoveryHTML = `<p><em>${translations.get('pop-no-discovery')}</em></p>`;
            }

            const titleHTML = `
                <div class="popup-header-row">
                    <span class="site-id">${translations.get('pop-site')} ${fid}</span>
                    <span class="tkaczow-id">${tkaczow}</span>
                </div>
            `;

            let html = `<div class="site-popup">
                <h4>${titleHTML}</h4>
                <div class="popup-content-body">
                    ${details.labelFr ? `<p class="site-label-big">${details.labelFr}</p>` : ''}
                    <div class="discovery-section">
                        <strong>${translations.get('pop-decouvertes')}</strong>
                        ${discoveryHTML}
                    </div>
            `;

            if (data.vestiges && data.vestiges.length > 0) {
                const vestigeMap = new Map();
                data.vestiges.forEach(v => {
                    const char = v.caracterisation || translations.get('pop-non-specifie');
                    if (!vestigeMap.has(char)) { vestigeMap.set(char, []); }
                    if (v.periode) {
                        const cleanPeriod = v.periode.split(' (')[0]; 
                        vestigeMap.get(char).push(cleanPeriod);
                    }
                });

                html += `<strong>${translations.get('pop-vestiges')}</strong><ul>`;
                vestigeMap.forEach((periods, char) => {
                    const uniquePeriods = [...new Set(periods)]; 
                    const periodStr = uniquePeriods.length > 0 ? ` (${uniquePeriods.join(', ')})` : '';
                    html += `<li>${char}${periodStr}</li>`;
                });
                html += `</ul>`;
            }

            if (data.bibliographies && data.bibliographies.length > 0) {
                html += `<strong>${translations.get('pop-biblio')}</strong><ul>`;
                data.bibliographies.forEach(b => {
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
                    html += `<li>${citation}${url}</li>`;
                });
                html += `</ul>`;
            }

            const uri = `https://data.cealex.org/sites/${fid}`;
            html += `<p style="margin-top: 15px; font-size: 0.9em;">URI <a href="${uri}" target="_blank">${uri}</a> 📄</p>`;
            html += `</div></div>`;

            if (this.popup) { this.popup.remove(); }
            this.popup = new maplibregl.Popup({ closeOnClick: true, maxWidth: '450px' })
                .setLngLat(coordinates)
                .setHTML(html)
                .addTo(this.map);

            setTimeout(() => {
                const contentNode = document.querySelector('.maplibregl-popup-content');
                if (contentNode) { contentNode.scrollTop = 0; }
            }, 10);

        } catch (error) {
            console.error("Error creating popup for fid:", fid, error);
            if (this.popup) { this.popup.remove(); }
            this.popup = new maplibregl.Popup()
                .setLngLat(coordinates)
                .setHTML(`<div class="site-popup"><h4>${translations.get('pop-error-title')}</h4><p>${translations.get('pop-error-msg')} ${fid}.</p></div>`)
                .addTo(this.map);
        }
    }

    copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(err => console.error('Clipboard failed', err));
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed'; textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus(); textArea.select();
            try { document.execCommand('copy'); } catch (err) {}
            document.body.removeChild(textArea);
        }
    }

    showCopyConfirmation(message) {
        const existingToast = document.querySelector('.copy-toast');
        if (existingToast) existingToast.remove();
        const toast = document.createElement('div');
        toast.className = 'copy-toast';
        toast.textContent = `${translations.get('toast-copied')} ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '1'; toast.style.top = '40px'; }, 10);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.top = '20px'; setTimeout(() => toast.remove(), 300); }, 3000);
    }

    injectToastStyles() {
        const style = document.createElement('style');
        style.innerHTML = `.copy-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 4px; z-index: 2000; opacity: 0; transition: all 0.3s; font-size: 0.9em; pointer-events: none; }`;
        document.head.appendChild(style);
    }

    toggleLayerVisibility(layerId, isVisible) {
        const visibility = isVisible ? 'visible' : 'none';
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
        if (layerId === 'espaces_publics-fill') this.map.setLayoutProperty('espaces_publics-line', 'visibility', visibility);
        else if (layerId === 'emprises-fill') this.map.setLayoutProperty('emprises-line', 'visibility', visibility);
    }

    setLayerOpacity(layerId, opacity) {
        const layer = this.map.getLayer(layerId);
        if (!layer) return;
        const prop = layer.type === 'raster' ? 'raster-opacity' : 'fill-opacity';
        if (layer.type === 'raster' || layer.type === 'fill') this.map.setPaintProperty(layerId, prop, opacity);
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

    initDistanceMeasure() {
        this.distanceMeasure = new DistanceMeasure(this.map);
    }
}