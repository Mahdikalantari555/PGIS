/**
 * Boundary Module
 * Handles loading and validation of the Tehran boundary GeoJSON
 */

import * as turf from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

// State
let boundaryPolygon = null;
let boundaryLoaded = false;
let boundaryLoadError = null;

/**
 * Load boundary GeoJSON from public directory
 * @returns {Promise<boolean>} True if loaded successfully
 */
export async function loadBoundary() {
    if (boundaryLoaded) {
        return true;
    }

    try {
        const response = await fetch('/tehran_bound.geojson');
        if (!response.ok) {
            throw new Error(`Failed to load boundary: ${response.statusText}`);
        }

        const geojson = await response.json();

        // Convert from EPSG:3857 to EPSG:4326 if needed
        const transformedGeojson = transformToWGS84(geojson);

        boundaryPolygon = transformedGeojson.features[0];
        boundaryLoaded = true;
        boundaryLoadError = null;

        console.log('[Boundary] Tehran boundary loaded successfully');
        return true;
    } catch (error) {
        console.error('[Boundary] Failed to load boundary:', error);
        boundaryLoadError = error.message;
        return false;
    }
}

/**
 * Transform GeoJSON from EPSG:3857 to EPSG:4326
 * @param {Object} geojson - Input GeoJSON in EPSG:3857
 * @returns {Object} Transformed GeoJSON in EPSG:4326
 */
function transformToWGS84(geojson) {
    // Check if transformation is needed
    const crs = geojson.crs;
    const is3857 = crs?.properties?.name?.includes('3857') ||
                   crs?.properties?.name?.includes('EPSG::3857');

    if (!is3857) {
        return geojson;
    }

    // Transform coordinates
    const transformCoord = (coords) => {
        return coords.map(ring => {
            return ring.map(coord => {
                // Web Mercator to WGS84
                const lng = (coord[0] / 20037508.34) * 180;
                const lat = (coord[1] / 20037508.34) * 180;
                return [lng, lat];
            });
        });
    };

    // Recursively transform geometry
    const transformGeometry = (geometry) => {
        if (geometry.type === 'MultiPolygon') {
            return {
                type: 'MultiPolygon',
                coordinates: geometry.coordinates.map(polygon =>
                    transformCoord(polygon)
                )
            };
        } else if (geometry.type === 'Polygon') {
            return {
                type: 'Polygon',
                coordinates: transformCoord(geometry.coordinates)
            };
        }
        return geometry;
    };

    return {
        type: 'FeatureCollection',
        features: geojson.features.map(feature => ({
            ...feature,
            geometry: transformGeometry(feature.geometry)
        })),
        crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::4326' } }
    };
}

/**
 * Check if a point is inside the boundary
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @returns {boolean} True if point is inside boundary
 */
export function isPointInBoundary(lng, lat) {
    if (!boundaryLoaded || !boundaryPolygon) {
        console.warn('[Boundary] Boundary not loaded');
        return false;
    }

    const pt = point([lng, lat]);
    const result = booleanPointInPolygon(pt, boundaryPolygon);

    return result;
}

/**
 * Get the boundary polygon for rendering
 * @returns {Object|null} Boundary GeoJSON feature or null
 */
export function getBoundary() {
    return boundaryPolygon;
}

/**
 * Check if boundary is loaded
 * @returns {boolean} True if boundary is loaded
 */
export function isBoundaryLoaded() {
    return boundaryLoaded;
}

/**
 * Get boundary load error
 * @returns {string|null} Error message or null
 */
export function getBoundaryError() {
    return boundaryLoadError;
}

/**
 * Get boundary as Turf polygon
 * @returns {Object|null} Turf polygon or null
 */
export function getBoundaryPolygon() {
    return boundaryPolygon;
}
