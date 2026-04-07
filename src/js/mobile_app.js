import maplibregl from 'maplibre-gl'; // <--- ده السطر اللي كان ناقص
import { App } from './app.js'; 
import { buildFilterUI, buildLayerList, attachAllEventListeners } from './mobile_ui.js'; 
import { filters_config } from './filters_config.js';
import { server_config } from './server_config.js';
import { FilterCollection } from './FilterCollection.js';
import { translations } from './translations.js';

export class MobileApp extends App {
    
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

        // DESKTOP SORT ORDER
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
        // Already handled in this class structure
    }

    // --- PULSE ANIMATION (Moved inside class to match Desktop) ---
    animatePulse() {
        const duration = 2000; 
        let start = null;
        const frame = (time) => {
            if (!start) start = time;
            const progress = (time - start) % duration;
            const t = progress / duration; 

            const radius = 8 + (17 * t);
            const opacity = 0.8 * (1 - t);

            if (this.map.getLayer('sites_fouilles-waves')) {
                this.map.setPaintProperty('sites_fouilles-waves', 'circle-radius', radius);
                this.map.setPaintProperty('sites_fouilles-waves', 'circle-opacity', opacity);
            }

            const pulseRadius = 6 + (3 * Math.sin(t * Math.PI)); 
            if (this.map.getLayer('sites_fouilles-pulse')) {
                 this.map.setPaintProperty('sites_fouilles-pulse', 'circle-radius', pulseRadius);
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }

    // --- OVERRIDE INITIALIZE TO START ANIMATION ---
    async initialize() {
        console.log('Initializing MOBILE application...');
        try {
            await this.initFilters();
            this.initLayerList();
            this.initEventListeners();
            
            this.initMapClickListener();
            this.initDeepLinkHandlers();
            this.initHoverEffect(); 
            this.initDistanceMeasure();
            this.initLanguageSwitcher(); 
            
            this.animatePulse(); // Start Pulse

            this.applyHighlightStyle(undefined); 
            console.log('Mobile Application initialized successfully.');
        } catch (error) {
            console.error("Failed to initialize the mobile application:", error);
        }
    }

    // --- DEEP LINKING (Uses Coordinates) ---
    async focusPointByFid(fid) {
        try {
            const response = await fetch(`${server_config.api_at}/sitesFouilles/${fid}/details`);
            if (!response.ok) return;
            const data = await response.json();

            // If we have coordinates from the DB (thanks to ST_X/ST_Y), fly there!
            if (data.details && data.details.lng && data.details.lat) {
                const coords = [data.details.lng, data.details.lat];
                
                // Fly to the point
                this.flyToCoordinates(coords, { zoom: 17, duration: 1500 });

                // Show Popup
                this.showPopupForSite(fid, coords);
            }
        } catch (e) { console.error("Deep link error:", e); }
    }

    // --- GROUPED DISCOVERIES (Matches Desktop Logic) ---
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

            // Group Discoveries Logic
            let groupedDiscoveriesHTML = '';
            if (data.discoveries && data.discoveries.length > 0) {
                const discoveriesByType = {};
                
                data.discoveries.forEach(d => {
                    const type = translations.get(d.type_decouverte);
                    if (!discoveriesByType[type]) discoveriesByType[type] = [];
                    const detailText = `${d.inventeur}, ${d.date_decouverte || '?'}`;
                    discoveriesByType[type].push(detailText);
                });

                groupedDiscoveriesHTML = '<ul>' + Object.keys(discoveriesByType).map(type => {
                    // Result: "Type (Inventor, Date; Inventor2, Date2)"
                    const details = discoveriesByType[type].join('; ');
                    return `<li>${type} (${details})</li>`;
                }).join('') + '</ul>';
            } else {
                groupedDiscoveriesHTML = `<p class="no-data">${translations.get('pop-no-discovery')}</p>`;
            }

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
                            ${groupedDiscoveriesHTML}
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
                                        const title = b.title || '';
                                        const pubTitle = b.publication_title || '';
                                        const url = b.url ? `<a href="${b.url}" target="_blank" style="text-decoration:none; margin-left:4px;">&#8599;</a>` : '';
                                        if (b.item_type === 'journalArticle') {
                                            citation = `${author}, «\u00A0${title}\u00A0», <em>${pubTitle}</em>${b.volume ? ' '+b.volume : ''}${b.issue ? '/'+b.issue : ''}, ${date}, ${pages}.`;
                                        } else if (b.item_type === 'bookSection') {
                                            citation = `${author}, «\u00A0${title}\u00A0», <em>${pubTitle}</em>, ${place}, ${date}, ${pages}.`;
                                        } else if (b.item_type === 'thesis') {
                                            citation = `${author}, ${title}, ${translations.get('pop-thesis')} ${b.publisher || ''}, ${place}, ${date}, ${pages}.`;
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
            this.popup = new maplibregl.Popup({ maxWidth: '90%', closeButton: true }) 
                .setLngLat(coordinates).setHTML(html).addTo(this.map);
        } catch (error) { console.error("Popup Error:", error); }
    }
}
