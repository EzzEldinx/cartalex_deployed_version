import maplibregl from 'maplibre-gl';
import { FilterCollection } from './FilterCollection.js';
import { filters_config } from './filters_config.js';
import { server_config } from './server_config.js';
import { buildFilterUI, buildLayerList, attachAllEventListeners } from './ui.js';
import { DistanceMeasure } from './DistanceMeasure.js';

// Define colors here
const defaultPointColor = 'rgb(155, 0, 245)'; // Your original color
const highlightPointColor = 'rgb(15, 150, 36)'; // Example highlight color (Yellow)

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
            // Apply default style initially
            this.applyHighlightStyle(undefined); // Call with undefined to set all to default

            //this.map.jumpTo({
            //    center: [29.9187, 31.2001], // Centered on Alexandria
            //    zoom: 12 // Level 12 is "zoomed out" (Level 13-14 is street view)
            //});

            console.log('Application initialized successfully.');
        } catch (error) {
            console.error("Failed to initialize the application:", error);
        }
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
            async () => { await this.updateMapFilter(); }, // Keep this callback as is
            (layerId, isVisible) => { this.toggleLayerVisibility(layerId, isVisible); },
            (layerId, opacity) => { this.setLayerOpacity(layerId, opacity); }
        );
    }

    initMapClickListener() {
        this.map.on('click', (e) => {
            if (this.distanceMeasure && this.distanceMeasure.isMeasurementActive()) {
                return;
            }
            const siteFeatures = this.map.queryRenderedFeatures(e.point, {
                layers: ['sites_fouilles-points']
            });
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
                // Updated zoom level to 16
                this.flyToCoordinates(coordinates, { zoom: 16, duration: 1000 });
                const onMoveEnd = () => {
                    this.map.off('moveend', onMoveEnd);
                    this.showPopupForSite(fid, coordinates);
                };
                this.map.on('moveend', onMoveEnd);
                this.updateUrlForPoint(fid);
            } else {
                // Clicking on background
                const lng = e.lngLat.lng.toFixed(6);
                const lat = e.lngLat.lat.toFixed(6);
                const coords = `${lat}, ${lng}`;
                this.copyToClipboard(coords);
                this.showCopyConfirmation(coords);
                
                // --- UPDATED: Reset URL and close popup ---
                if (this.popup) { 
                    this.popup.remove(); 
                    this.popup = null;
                }
                this.resetUrl();
            }
        });
        this.map.on('mouseenter', 'sites_fouilles-points', () => { this.map.getCanvas().style.cursor = 'pointer'; });
        this.map.on('mouseleave', 'sites_fouilles-points', () => { this.map.getCanvas().style.cursor = ''; });
    }

    initDeepLinkHandlers() {
        const pathMatch = window.location.pathname.match(/\/carte\/(\d+)/);
        if (pathMatch && pathMatch[1]) {
            const fid = pathMatch[1];
            this.focusPointByFid(fid);
        }

        window.addEventListener('popstate', () => {
            const popPathMatch = window.location.pathname.match(/\/carte\/(\d+)/);
            if (popPathMatch && popPathMatch[1]) {
                const fidPop = popPathMatch[1];
                this.focusPointByFid(fidPop);
            } else {
                if (this.popup) { this.popup.remove(); this.popup = null; }
            }
        });
    }

    updateUrlForPoint(fid) {
        const url = new URL(`${window.location.origin}/carte/${fid}`);
        window.history.pushState({}, '', url);
    }

    // --- NEW METHOD: Resets URL to default ---
    resetUrl() {
        const url = new URL(`${window.location.origin}/carte`);
        window.history.pushState({}, '', url);
    }

    flyToCoordinates(coordinates, { zoom = 16, duration = 1000 } = {}) {
        this.map.flyTo({
            center: coordinates,
            zoom,
            duration,
            curve: 1.6,
            easing: (t) => 1 - Math.pow(1 - t, 2)
        });
    }

    async focusPointByFid(fid) {
        try {
            const coords = await this.getCoordinatesForFid(fid);
            if (!coords) {
                console.warn(`Could not find coordinates for fid: ${fid}`);
                return;
            }
            this.flyToCoordinates(coords, { zoom: 16, duration: 1000 });
            const onMoveEnd = () => {
                this.map.off('moveend', onMoveEnd);
                this.showPopupForSite(fid, coords);
            };
            this.map.on('moveend', onMoveEnd);
        } catch (e) {
            console.error('Failed to focus point by fid', fid, e);
        }
    }

    async getCoordinatesForFid(targetFid) {
        const tryFind = () => {
            const features = this.map.querySourceFeatures('tegola_points', { sourceLayer: 'sites_fouilles' }) || [];
            for (const f of features) {
                if (String(f.id) === String(targetFid)) {
                    const c = f.geometry.coordinates;
                    return Array.isArray(c) ? c.slice() : null;
                }
            }
            return null;
        };
        let found = tryFind();
        if (found) { return found; }
        const maxAttempts = 5;
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => {
                const handler = () => { this.map.off('idle', handler); resolve(); };
                this.map.on('idle', handler);
            });
            found = tryFind();
            if (found) { return found; }
        }
        console.warn(`Coordinates not found after multiple attempts for fid: ${targetFid}`);
        return null;
    }

    initHoverEffect() {
        this.map.on('mousemove', 'sites_fouilles-points', (e) => {
            if (e.features.length > 0) {
                const currentFid = e.features[0].id;
                if (this.hoveredFid !== currentFid) {
                    if (this.hoveredFid !== null) {
                        this.map.setFeatureState(
                            { source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid },
                            { hover: false }
                        );
                    }
                    this.hoveredFid = currentFid;
                    this.map.setFeatureState(
                        { source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid },
                        { hover: true }
                    );
                }
            }
        });
        this.map.on('mouseleave', 'sites_fouilles-points', () => {
            if (this.hoveredFid !== null) {
                this.map.setFeatureState(
                    { source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid },
                    { hover: false }
                );
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

    // --- Helper Functions for Formatting ---

    formatAuthors(authorString) {
        if (!authorString) return '';
        const authors = authorString.split(';');
        const formattedAuthors = authors.map(auth => {
            const parts = auth.split(',').map(s => s.trim());
            if (parts.length >= 2) {
                const lastname = parts[0];
                const firstname = parts[1];
                const initials = firstname.split(/[\s-]+/).map(n => n.charAt(0) + '.').join('-');
                return `${initials}\u00A0${lastname}`; 
            }
            return parts[0];
        });
        return formattedAuthors.join(', ');
    }

    formatPages(pages) {
        if (!pages) return '';
        const isNumeric = /^[\d\s-]+$/.test(pages);
        if (isNumeric) {
            return `p.\u00A0${pages}`;
        }
        return pages;
    }

    async showPopupForSite(fid, coordinates) {
        try {
            const response = await fetch(`${server_config.api_at}/sitesFouilles/${fid}/details`);
            if (!response.ok) {
                throw new Error(`API request failed for fid: ${fid}`);
            }
            const data = await response.json();

            const details = data.details || {};
            const tkaczow = details.num_tkaczow ? `Tkaczow\u00A0${details.num_tkaczow}` : '';
            
            // Discovery List
            let discoveryHTML = '';
            if (data.discoveries && data.discoveries.length > 0) {
                discoveryHTML = `<ul style="margin: 5px 0; padding-left: 20px;">`;
                data.discoveries.forEach(d => {
                    const inventor = d.inventeur || 'Inconnu';
                    let extra = [];
                    if (d.date_decouverte) extra.push(d.date_decouverte);
                    if (d.type_decouverte) extra.push(d.type_decouverte);
                    const extraStr = extra.length > 0 ? ` (${extra.join(', ')})` : '';
                    
                    discoveryHTML += `<li>${inventor}${extraStr}</li>`;
                });
                discoveryHTML += `</ul>`;
            } else {
                discoveryHTML = `<p><em>Aucune découverte enregistrée</em></p>`;
            }

            const titleHTML = `
                <div class="popup-header-row">
                    <span class="site-id">Site ${fid}</span>
                    <span class="tkaczow-id">${tkaczow}</span>
                </div>
            `;

            let html = `<div class="site-popup">
                <h4>${titleHTML}</h4>
                <div class="popup-content-body">
                    ${details.labelFr ? `<p style="margin: 5px 0; font-weight: bold; color: #555;">${details.labelFr}</p>` : ''}
                    <div class="discovery-section">
                        <strong>Découvertes :</strong>
                        ${discoveryHTML}
                    </div>
            `;

            // Vestiges
            if (data.vestiges && data.vestiges.length > 0) {
                html += `<strong>Vestiges\u00A0:</strong><ul>`;
                data.vestiges.forEach(v => {
                    const caracterisation = v.caracterisation || '';
                    const period = v.periode ? v.periode.split(' (')[0] : '';
                    const periodDisplay = period ? ` (${period})` : '';
                    html += `<li>${caracterisation}${periodDisplay}</li>`;
                });
                html += `</ul>`;
            }

            // Bibliography
            if (data.bibliographies && data.bibliographies.length > 0) {
                html += `<strong>Bibliographie sélective\u00A0:</strong><ul>`;
                data.bibliographies.forEach(b => {
                    let citation = '';
                    const author = this.formatAuthors(b.author);
                    const date = b.date || '';
                    const pages = this.formatPages(b.pages);
                    const place = b.place || '';
                    const publisher = b.publisher || '';
                    const title = b.title || '';
                    const pubTitle = b.publication_title || '';
                    const vol = b.volume ? ` ${b.volume}` : '';
                    const issue = b.issue ? `/${b.issue}` : '';
                    const url = b.url ? `<a href="${b.url}" target="_blank" style="text-decoration:none; margin-left:4px;">&#8599;</a>` : '';

                    switch (b.item_type) {
                        case 'book':
                        case 'report':
                            citation = `${author}, <em>${title}</em>, ${place}, ${date}, ${pages}.`;
                            break;
                        case 'bookSection':
                            citation = `${author}, «\u00A0${title}\u00A0», <em>${pubTitle}</em>, ${place}, ${date}, ${pages}.`;
                            break;
                        case 'journalArticle':
                            citation = `${author}, «\u00A0${title}\u00A0», <em>${pubTitle}</em>${vol}${issue}, ${date}, ${pages}.`;
                            break;
                        case 'thesis':
                            citation = `${author}, ${title}, thèse ${publisher}, ${place}, ${date}, ${pages}.`;
                            break;
                        case 'webpage':
                        case 'blogPost':
                            const access = b.access_date ? `, consulté le ${b.access_date}` : '';
                            citation = `${author}, «\u00A0${title}\u00A0», <em>${pubTitle}</em>${access} à l'adresse ${b.url || ''}.`;
                            break;
                        default:
                            citation = `${author}, ${title}, ${date}.`;
                    }
                    citation = citation.replace(/, ,/g, ',').replace(/, \./g, '.');
                    html += `<li>${citation}${url}</li>`;
                });
                html += `</ul>`;
            }

            // URI Link
            const uri = `https://data.cealex.org/sites/${fid}`;
            html += `<p style="margin-top: 15px; font-size: 0.9em;">
                URI <a href="${uri}" target="_blank">${uri}</a> 📄
            </p>`;

            html += `</div></div>`;

            if (this.popup) { this.popup.remove(); }
            this.popup = new maplibregl.Popup({ closeOnClick: true, maxWidth: '450px' })
                .setLngLat(coordinates)
                .setHTML(html)
                .addTo(this.map);
        } catch (error) {
            console.error("Error creating popup for fid:", fid, error);
            if (this.popup) { this.popup.remove(); }
            this.popup = new maplibregl.Popup()
                .setLngLat(coordinates)
                .setHTML(`<div class="site-popup"><h4>Error</h4><p>Could not load details for site ${fid}.</p></div>`)
                .addTo(this.map);
        }
    }

    copyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try { document.execCommand('copy'); }
        catch (err) { console.error('Fallback: Unable to copy', err); }
        document.body.removeChild(textArea);
    }

    showCopyConfirmation(message) {
        const existingToast = document.querySelector('.copy-toast');
        if (existingToast) { existingToast.remove(); }
        const toast = document.createElement('div');
        toast.className = 'copy-toast';
        toast.textContent = `Copied to clipboard: ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '1'; toast.style.top = '40px'; }, 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.top = '20px';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    injectToastStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .copy-toast {
                position: fixed;
                top: 20px; /* Start slightly higher */
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 1001; /* Ensure it's above other elements */
                opacity: 0; /* Start hidden */
                transition: top 0.3s ease-out, opacity 0.3s ease-out; /* Smooth transitions */
                font-family: sans-serif;
                font-size: 0.9em;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
        `;
        document.head.appendChild(style);
    }

    toggleLayerVisibility(layerId, isVisible) {
        const visibility = isVisible ? 'visible' : 'none';
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
        if (layerId === 'espaces_publics-fill') {
            this.map.setLayoutProperty('espaces_publics-line', 'visibility', visibility);
        } else if (layerId === 'emprises-fill') {
            this.map.setLayoutProperty('emprises-line', 'visibility', visibility);
        }
    }

    setLayerOpacity(layerId, opacity) {
        const layer = this.map.getLayer(layerId);
        if (!layer) {
            console.warn(`Attempted to set opacity on a non-existent layer: ${layerId}`);
            return;
        }
        if (layer.type === 'raster') {
            this.map.setPaintProperty(layerId, 'raster-opacity', opacity);
        } else if (layer.type === 'fill') {
            this.map.setPaintProperty(layerId, 'fill-opacity', opacity);
        } else {
            console.warn(`Layer type "${layer.type}" does not support opacity control.`);
        }
    }

    applyHighlightStyle(filteredIds) {
        const layerId = 'sites_fouilles-points';
        let colorExpression;

        if (filteredIds === undefined || filteredIds === null) {
            colorExpression = defaultPointColor;
        } else if (filteredIds.length === 0) {
            colorExpression = defaultPointColor;
        }
        else {
            const literalIds = filteredIds.map(id => {
                const numId = Number(id);
                return isNaN(numId) ? String(id) : numId;
            });

            colorExpression = [
                'case',
                ['in', ['id'], ['literal', literalIds]],
                highlightPointColor,
                defaultPointColor
            ];
        }

        try {
            this.map.setPaintProperty(layerId, 'circle-color', colorExpression);
        } catch (error) {
            console.error("Error setting paint property for highlighting:", error);
            this.map.setPaintProperty(layerId, 'circle-color', defaultPointColor);
        }
    }

    async updateMapFilter() {
        const activeFilters = this.filterCollection.getActiveFilters();
        let filteredIds;

        if (activeFilters.length === 0) {
            filteredIds = undefined;
            this.map.setFilter('sites_fouilles-points', null);
        } else {
            filteredIds = await this.filterCollection.getFilteredIds();

            if (filteredIds && filteredIds.length > 0) {
                const literalIdsForFilter = filteredIds.map(id => {
                    const numId = Number(id);
                    return isNaN(numId) ? String(id) : numId;
                });
                const visibilityFilter = ['in', ['id'], ['literal', literalIdsForFilter]];
                this.map.setFilter('sites_fouilles-points', visibilityFilter);
            } else {
                this.map.setFilter('sites_fouilles-points', ['in', ['id'], '']);
            }
        }

        this.applyHighlightStyle(filteredIds);
    }

    initDistanceMeasure() {
        this.distanceMeasure = new DistanceMeasure(this.map);
        console.log('Distance Measure tool initialized');
    }
}