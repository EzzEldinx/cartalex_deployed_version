import 'maplibre-gl/dist/maplibre-gl.css';
import './css/map.css';
import maplibregl from 'maplibre-gl';
import { App } from './js/app.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        return; 
    }

    const INITIAL_CENTER = [29.9187, 31.2001];
    const INITIAL_ZOOM = 13;

    const map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            glyphs: "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=GzYHb1s2PfKzmvlMBs7V",
            sources: {
                osm: { 
                    type: 'raster', 
                    tiles: ['https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=GzYHb1s2PfKzmvlMBs7V'], 
                    tileSize: 512,
                    attribution: 'Carte des découvertes archéologiques dans les quartiers urbains d’Alexandrie ancienne © CEAlex - © MapTiler © OpenStreetMap Contributors'
                },
                satellite: { 
                    type: 'raster', 
                    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], 
                    tileSize: 256, 
                    maxzoom: 19,
                    attribution: 'Tiles &copy; Esri' 
                },
                /* تم تصحيح الروابط هنا لتشير للدومين بدلاً من localhost */
                tegola_points: { type: 'vector', tiles: ['http://maps.cealex.org:8080/maps/cartalex/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },
                pgts_parcelles_region: { type: 'vector', tiles: ['http://maps.cealex.org:7800/public.parcelles_region/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },
                pgts_emprises: { type: 'vector', tiles: ['http://maps.cealex.org:7800/public.emprises/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },
                pgts_littoral: { type: 'vector', tiles: ['http://maps.cealex.org:7800/public.littoral/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },
                "plan-adriani": { type: "raster", tiles: ["/adriani/{z}/{x}/{y}.png"], tileSize: 256, attribution: "Plan d'Adriani, 1934" },
                "plan-tkaczow": { type: "raster", tiles: ["/tkaczow/{z}/{x}/{y}.png"], tileSize: 256, attribution: "Plan de Tkaczow, 1993" },
                "plan-falaky":  { type: "raster", tiles: ["/falaky/{z}/{x}/{y}.png"],  tileSize: 256, attribution: "Restitution de Mahmoud Bey el-Falaki, 1866" },
            },
            layers: [
                { id: 'osm-background', type: 'raster', source: 'osm', layout: { 'visibility': 'visible' } },
                { id: 'satellite-background', type: 'raster', source: 'satellite', layout: { 'visibility': 'none' } },
                { id: "Plan d'Adriani, 1934", type: "raster", source: "plan-adriani", layout: { "visibility": "none" } },
                { id: "Plan de Tkaczow, 1993", type: "raster", source: "plan-tkaczow", layout: { "visibility": "none" } },
                { id: "Restitution de Mahmoud bey el-Falaki, 1866",  type: "raster", source: "plan-falaky",  layout: { "visibility": "none" } },
                { id: 'emprises-fill', type: 'fill', source: 'pgts_emprises', 'source-layer': 'public.emprises', layout: { 'visibility': 'none' }, paint: { 'fill-color': 'rgba(255, 255, 255, 0.6)' } },
                { id: 'emprises-line', type: 'line', source: 'pgts_emprises', 'source-layer': 'public.emprises', layout: { 'visibility': 'none' }, paint: { 'line-color': 'rgba(153, 9, 182, 0.6)', 'line-width': 2.5 }, metadata: { 'filter-ui': 'ignore' } },
                { id: 'littoral-line', type: 'line', source: 'pgts_littoral', 'source-layer': 'public.littoral', layout: { 'visibility': 'none' }, paint: { 'line-color': 'rgb(78, 152, 215)', 'line-width': 4 } },
                { id: 'parcelles_region-fill', type: 'fill', source: 'pgts_parcelles_region', 'source-layer': 'public.parcelles_region', layout: { 'visibility': 'none' }, paint: { 'fill-color': 'rgba(255, 255, 255, 0.6)', 'fill-outline-color': '#4E98D7' } },
                { id: 'sites_fouilles-waves', type: 'circle', source: 'tegola_points', 'source-layer': 'sites_fouilles', paint: { 'circle-radius': 8, 'circle-radius-transition': { duration: 0 }, 'circle-opacity-transition': { duration: 0 }, 'circle-color': 'rgb(251, 255, 0)', 'circle-stroke-color': 'yellow', 'circle-stroke-width': 4 }, filter: ['==', ['id'], ''], metadata: { 'filter-ui': 'ignore' } },
                { id: 'sites_fouilles-pulse', type: 'circle', source: 'tegola_points', 'source-layer': 'sites_fouilles', paint: { 'circle-radius': 6, 'circle-color': 'rgb(251, 255, 0)', 'circle-stroke-color': 'yellow', 'circle-stroke-width': 1.5, 'circle-opacity': 1.0 }, filter: ['==', ['id'], ''], metadata: { 'filter-ui': 'ignore' } },
                { id: 'sites_fouilles-points', type: 'circle', source: 'tegola_points', 'source-layer': 'sites_fouilles', paint: { 'circle-radius': 6, 'circle-color': 'rgb(155, 0, 245)', 'circle-stroke-color': 'white', 'circle-stroke-width': 2 } }
            ]
        },
        center: INITIAL_CENTER,
        zoom: INITIAL_ZOOM,
        attributionControl: false 
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 200, unit: 'metric' }), 'bottom-left');

    map.on('load', async () => {
        const app = new App(map);
        await app.initialize();

        const coordinatesDisplay = document.getElementById('coordinates-display');
        map.on('mousemove', (e) => {
            if(coordinatesDisplay) {
                coordinatesDisplay.innerHTML = `Lat/Lon: ${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`;
            }
        });
    });
});