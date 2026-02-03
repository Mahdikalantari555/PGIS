/**
 * Map Initialization Module
 * Sets up the MapLibre GL JS map with all required layers
 */

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { addLayers, updateHotspotLayer } from './layers.js';
import { loadBoundary, isPointInBoundary } from './boundary.js';
import { showVotePopup } from '../ui/popup.js';
import { setSelectionMode, isSelectionMode, setMapClickHandler } from '../ui/controls.js';

// Map instance
let map = null;
let mapInitialized = false;

// Map state
export const MAP_STATE = {
    IDLE: 'IDLE',
    SELECT_MODE: 'SELECT_MODE',
    CLICK_VALIDATE: 'CLICK_VALIDATE',
    POPUP_INPUT: 'POPUP_INPUT',
    SUBMIT_VOTE: 'SUBMIT_VOTE',
    UPDATE_HOTSPOT: 'UPDATE_HOTSPOT'
};

let currentState = MAP_STATE.IDLE;

/**
 * Initialize the map
 * @returns {Promise<MapLibre Map>} Initialized map instance
 */
export async function initMap() {
    if (mapInitialized) {
        console.log('[Map] Map already initialized');
        return map;
    }

    console.log('[Map] Initializing map...');

    // Load boundary first
    const boundaryLoaded = await loadBoundary();
    if (!boundaryLoaded) {
        console.warn('[Map] Boundary failed to load, continuing without boundary validation');
    }

    // Initialize MapLibre map
    map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            sources: {
                'osm': {
                    type: 'raster',
                    tiles: [
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap contributors'
                }
            },
            layers: [
                {
                    id: 'osm-layer',
                    type: 'raster',
                    source: 'osm',
                    minzoom: 0,
                    maxzoom: 19
                }
            ]
        },
        center: [51.389, 35.6892], // Tehran center
        zoom: 11,
        pitch: 0,
        bearing: 0,
        antialias: true
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    // Wait for map to load
    await new Promise((resolve, reject) => {
        map.on('load', resolve);
        map.on('error', reject);
    });

    console.log('[Map] Map loaded');

    // Add all layers
    addLayers(map);

    // Set up map click handler
    setupMapClickHandler();

    mapInitialized = true;
    console.log('[Map] Map initialization complete');
    return map;
}

/**
 * Set up the map click handler based on selection mode
 */
function setupMapClickHandler() {
    map.on('click', (e) => {
        if (!isSelectionMode()) {
            return;
        }

        const { lng, lat } = e.lngLat;

        console.log(`[Map] Clicked at lng: ${lng.toFixed(6)}, lat: ${lat.toFixed(6)}`);

        // Validate point is inside boundary
        if (!isPointInBoundary(lng, lat)) {
            console.log('[Map] Click outside boundary - rejecting');
            // Emit event for UI to show warning
            window.dispatchEvent(new CustomEvent('boundaryWarning', {
                detail: { lng, lat }
            }));
            return;
        }

        console.log('[Map] Click inside boundary - showing vote form');
        // Show vote submission popup
        showVotePopup(lng, lat);
    });
}

/**
 * Get the map instance
 * @returns {MapLibre Map|null} Map instance or null
 */
export function getMap() {
    return map;
}

/**
 * Check if map is initialized
 * @returns {boolean} True if initialized
 */
export function isMapInitialized() {
    return mapInitialized;
}

/**
 * Get current map state
 * @returns {string} Current state
 */
export function getCurrentState() {
    return currentState;
}

/**
 * Set current map state
 * @param {string} state - New state
 */
export function setCurrentState(state) {
    currentState = state;
    console.log(`[Map] State changed: ${state}`);

    // Emit state change event
    window.dispatchEvent(new CustomEvent('mapStateChange', {
        detail: { state }
    }));
}

/**
 * Fly to a location
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @param {number} zoom - Zoom level
 */
export function flyTo(lng, lat, zoom = 14) {
    if (map) {
        map.flyTo({
            center: [lng, lat],
            zoom,
            duration: 1500
        });
    }
}

/**
 * Update the hotspot layer with new votes
 * @param {Object} votesGeoJSON - GeoJSON of votes
 */
export async function updateHotspots(votesGeoJSON) {
    if (!map || !mapInitialized) {
        console.warn('[Map] Map not ready for hotspot update');
        return;
    }

    await updateHotspotLayer(map, votesGeoJSON);
    console.log('[Map] Hotspot layer updated with', votesGeoJSON?.features?.length || 0, 'votes');
}

/**
 * Fit map to boundary bounds
 */
export function fitToBoundary() {
    if (!map || !isBoundaryLoaded()) {
        return;
    }

    // Get boundary coordinates and calculate bounds
    const boundary = getBoundary();
    if (!boundary) {
        return;
    }

    // Use turf to get bounds
    const bbox = boundary.bbox || null;
    if (bbox) {
        map.fitBounds([
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]]
        ], {
            padding: 50,
            duration: 1000
        });
    }
}

// Re-export boundary functions
export { loadBoundary, isPointInBoundary, isBoundaryLoaded, getBoundary } from './boundary.js';
