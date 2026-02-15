import { App } from './app.js'; 
import { buildFilterUI, buildLayerList, attachAllEventListeners } from './mobile_ui.js'; 
import { filters_config } from './filters_config.js';
import { server_config } from './server_config.js';
import { FilterCollection } from './FilterCollection.js';

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
}