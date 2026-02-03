/**
 * Layers Module
 * Manages all map layers including boundary, satellite, and hotspot
 */

import maplibregl from 'maplibre-gl';
import { getBoundary } from './boundary.js';

/**
 * Add all layers to the map
 * @param {MapLibre Map} map - MapLibre map instance
 */
export function addLayers(map) {
    console.log('[Layers] Adding layers...');

    // Add boundary source and layer
    addBoundaryLayer(map);

    // Add hotspot source (empty initially)
    addHotspotSource(map);

    console.log('[Layers] All layers added');
}

/**
 * Add boundary layer
 * @param {MapLibre Map} map - MapLibre map instance
 */
function addBoundaryLayer(map) {
    const boundary = getBoundary();

    if (!boundary) {
        console.warn('[Layers] No boundary data available');
        return;
    }

    // Add boundary as a source
    map.addSource('boundary', {
        type: 'geojson',
        data: boundary
    });

    // Add boundary outline
    map.addLayer({
        id: 'boundary-line',
        type: 'line',
        source: 'boundary',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#ff6b6b',
            'line-width': 3,
            'line-opacity': 0.9
        }
    });

    // Add boundary fill
    map.addLayer({
        id: 'boundary-fill',
        type: 'fill',
        source: 'boundary',
        paint: {
            'fill-color': '#ff6b6b',
            'fill-opacity': 0.1
        }
    });

    console.log('[Layers] Boundary layer added');
}

/**
 * Add hotspot source
 * @param {MapLibre Map} map - MapLibre map instance
 */
function addHotspotSource(map) {
    // Add empty GeoJSON source for hotspots
    map.addSource('hotspots', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    // Add heatmap layer
    map.addLayer({
        id: 'hotspot-heatmap',
        type: 'heatmap',
        source: 'hotspots',
        maxzoom: 15,
        paint: {
            // Increase the heatmap weight based on favorability score (0-5)
            'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'score'],
                0, 0,
                5, 1
            ],
            // Increase the heatmap color intensity
            'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 1,
                15, 3
            ],
            // Color ramp for heatmap (blue to red)
            'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(0, 0, 255, 0)',
                0.2, 'rgba(0, 255, 0, 0.5)',
                0.4, 'rgba(255, 255, 0, 0.6)',
                0.6, 'rgba(255, 165, 0, 0.7)',
                0.8, 'rgba(255, 69, 0, 0.8)',
                1, 'rgba(255, 0, 0, 0.9)'
            ],
            // Adjust heatmap radius
            'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 30,
                15, 35
            ],
            // Heatmap opacity
            'heatmap-opacity': 0.8
        }
    });

    console.log('[Layers] Hotspot layer added');
}

/**
 * Update hotspot layer with new votes
 * @param {MapLibre Map} map - MapLibre map instance
 * @param {Object} votesGeoJSON - GeoJSON containing vote features
 */
export async function updateHotspotLayer(map, votesGeoJSON) {
    if (!map || !map.getSource('hotspots')) {
        console.warn('[Layers] Hotspot source not available');
        return;
    }

    const source = map.getSource('hotspots');

    if (votesGeoJSON && votesGeoJSON.features && votesGeoJSON.features.length > 0) {
        source.setData(votesGeoJSON);
        console.log('[Layers] Hotspot layer updated with', votesGeoJSON.features.length, 'votes');
    } else {
        // Clear hotspots if no votes
        source.setData({
            type: 'FeatureCollection',
            features: []
        });
        console.log('[Layers] Hotspot layer cleared');
    }
}

/**
 * Toggle boundary visibility
 * @param {MapLibre Map} map - MapLibre map instance
 * @param {boolean} visible - Whether boundary should be visible
 */
export function toggleBoundaryVisibility(map, visible) {
    if (!map) return;

    const visibility = visible ? 'visible' : 'none';

    if (map.getLayer('boundary-line')) {
        map.setLayoutProperty('boundary-line', 'visibility', visibility);
    }
    if (map.getLayer('boundary-fill')) {
        map.setLayoutProperty('boundary-fill', 'visibility', visibility);
    }

    console.log(`[Layers] Boundary visibility: ${visibility}`);
}

/**
 * Toggle hotspot visibility
 * @param {MapLibre Map} map - MapLibre map instance
 * @param {boolean} visible - Whether hotspots should be visible
 */
export function toggleHotspotVisibility(map, visible) {
    if (!map || !map.getLayer('hotspot-heatmap')) return;

    const visibility = visible ? 'visible' : 'none';
    map.setLayoutProperty('hotspot-heatmap', 'visibility', visibility);
    console.log(`[Layers] Hotspot visibility: ${visibility}`);
}

/**
 * Check if boundary layer exists
 * @param {MapLibre Map} map - MapLibre map instance
 * @returns {boolean} True if boundary layer exists
 */
export function hasBoundaryLayer(map) {
    return map && map.getLayer('boundary-line') !== undefined;
}

/**
 * Check if hotspot layer exists
 * @param {MapLibre Map} map - MapLibre map instance
 * @returns {boolean} True if hotspot layer exists
 */
export function hasHotspotLayer(map) {
    return map && map.getLayer('hotspot-heatmap') !== undefined;
}
