/**
 * Weighted Kernel Density Estimation (WKDE) Utility
 * For Tehran hotspot detection based on crowdsourced vote favorability scores
 */

// Haversine formula to calculate distance between two points in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Convert lat/lng to approximate meter-based coordinates
// Using Tehran's approximate center for projection
const TEHRAN_CENTER_LAT = 35.6892;
const TEHRAN_CENTER_LNG = 51.3890;

function latLngToMeters(lat, lng) {
  const latMeters = (lat - TEHRAN_CENTER_LAT) * 111320;
  const lngMeters =
    ((lng - TEHRAN_CENTER_LNG) * 111320 * Math.cos((TEHRAN_CENTER_LAT * Math.PI) / 180));
  return { x: lngMeters, y: latMeters };
}

function metersToLatLng(x, y) {
  const lng = (x / (111320 * Math.cos((TEHRAN_CENTER_LAT * Math.PI) / 180))) + TEHRAN_CENTER_LNG;
  const lat = (y / 111320) + TEHRAN_CENTER_LAT;
  return { lat, lng };
}

/**
 * Gaussian Kernel Function
 * K(u) = (1 / sqrt(2π)) * exp(-0.5 * u²)
 * @param {number} distance - Distance from kernel center
 * @param {number} bandwidth - Kernel bandwidth
 * @returns {number} Kernel weight (0-1)
 */
function gaussianKernel(distance, bandwidth) {
  const u = distance / bandwidth;
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
}

/**
 * Normalize grid data to a specified range
 * @param {Array} gridData - 1D array of grid values
 * @param {number} min - Current minimum value
 * @param {number} max - Current maximum value
 * @param {number} newMin - Target minimum value (default 0)
 * @param {number} newMax - Target maximum value (default 1)
 * @returns {Array} Normalized grid data
 */
function normalizeGrid(gridData, min, max, newMin = 0, newMax = 1) {
  if (max === min) {
    return gridData.map(() => newMin);
  }
  const range = max - min;
  const newRange = newMax - newMin;
  return gridData.map((value) => {
    if (value === null || value === undefined) return null;
    return ((value - min) / range) * newRange + newMin;
  });
}

/**
 * Parse GeoJSON boundary and cache results
 * @param {Object} geoJSON - GeoJSON polygon or FeatureCollection
 * @returns {Object} Parsed boundary with coords and bbox
 */
function parseBoundary(geoJSON) {
  if (!geoJSON) return null;

  // Handle FeatureCollection
  if (geoJSON.type === 'FeatureCollection' && geoJSON.features) {
    const feature = geoJSON.features[0];
    if (feature) return parseBoundary(feature);
    return null;
  }

  // Handle Feature
  if (geoJSON.type === 'Feature' && geoJSON.geometry) {
    return parseBoundary(geoJSON.geometry);
  }

  // Handle Polygon/MultiPolygon
  const geometryType = geoJSON.type;
  const coordsArray = geoJSON.coordinates;

  if (!coordsArray || !Array.isArray(coordsArray) || coordsArray.length === 0) {
    return null;
  }

  const isMulti = geometryType === 'MultiPolygon';
  const coords = isMulti ? coordsArray[0][0] : coordsArray;

  if (!coords || coords.length === 0) return null;

  // Calculate bounding box
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  for (let i = 0; i < coords.length; i++) {
    const lng = coords[i][0];
    const lat = coords[i][1];
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return {
    coords,
    bbox: { minLng, maxLng, minLat, maxLat },
    isMulti
  };
}

/**
 * Check if a point is inside a GeoJSON polygon
 * Optimized version with bounding box pre-check
 * GeoJSON coordinates are [lng, lat] order
 * @param {number} lat - Point latitude
 * @param {number} lng - Point longitude
 * @param {Object} boundary - Parsed boundary object
 * @returns {boolean} True if point is inside polygon
 */
function isPointInPolygon(lat, lng, boundary) {
  if (!boundary) return true;

  const { coords, bbox } = boundary;

  // Quick bounding box rejection
  if (lng < bbox.minLng || lng > bbox.maxLng ||
      lat < bbox.minLat || lat > bbox.maxLat) {
    return false;
  }

  let inside = false;

  // Ray-casting algorithm
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0];  // longitude
    const yi = coords[i][1];  // latitude
    const xj = coords[j][0];  // longitude
    const yj = coords[j][1];  // latitude

    // Skip degenerate edges
    if (Math.abs(yj - yi) < 1e-10) continue;

    const intersect = ((yi > lat) !== (yj > lat)) &&
                     (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculate Weighted Kernel Density Estimation
 * @param {Array} points - Array of objects with lat, lng, weight properties
 * @param {number} bandwidth - Kernel bandwidth in meters
 * @param {number} cellSize - Grid cell size in meters
 * @param {Object} boundary - GeoJSON polygon for boundary clipping (optional)
 * @returns {Object} Grid data with min, max values
 */
function calculateWeightedKDE(points, bandwidth, cellSize, boundary = null) {
  if (!points || points.length === 0) {
    console.warn('[WKDE] No points provided for density estimation');
    return { gridData: [], min: 0, max: 0, width: 0, height: 0, bounds: null };
  }

  // Validate points
  const validPoints = points.filter(
    (p) =>
      p.lat !== undefined &&
      p.lng !== undefined &&
      p.weight !== undefined &&
      p.weight >= 0
  );

  if (validPoints.length === 0) {
    console.warn('[WKDE] No valid points found');
    return { gridData: [], min: 0, max: 0, width: 0, height: 0, bounds: null };
  }

  // Parse boundary once
  const parsedBoundary = boundary ? parseBoundary(boundary) : null;
  if (boundary && !parsedBoundary) {
    console.warn('[WKDE] Could not parse boundary, clipping disabled');
  }

  // Calculate grid extent based on boundary (if available) or points
  let minLat, maxLat, minLng, maxLng;
  
  if (parsedBoundary) {
    // Use boundary extent
    const { bbox } = parsedBoundary;
    // Convert boundary bbox to meters
    const sw = latLngToMeters(bbox.minLat, bbox.minLng);
    const ne = latLngToMeters(bbox.maxLat, bbox.maxLng);
    minLat = sw.y;
    maxLat = ne.y;
    minLng = sw.x;
    maxLng = ne.x;
    console.log('[WKDE] Using boundary extent for grid');
  } else {
    // Use points extent
    minLat = Infinity;
    maxLat = -Infinity;
    minLng = Infinity;
    maxLng = -Infinity;

    validPoints.forEach((p) => {
      const { x, y } = latLngToMeters(p.lat, p.lng);
      if (y < minLat) minLat = y;
      if (y > maxLat) maxLat = y;
      if (x < minLng) minLng = x;
      if (x > maxLng) maxLng = x;
    });
  }

  // Add padding based on bandwidth (only if using points, not boundary)
  const padding = parsedBoundary ? 0 : bandwidth * 2;
  minLat -= padding;
  maxLat += padding;
  minLng -= padding;
  maxLng += padding;

  // Calculate grid dimensions
  const gridWidth = Math.ceil((maxLng - minLng) / cellSize);
  const gridHeight = Math.ceil((maxLat - minLat) / cellSize);

  // Validate grid size to prevent excessive memory usage
  const MAX_CELLS = 500000; // ~700x700 grid
  if (gridWidth * gridHeight > MAX_CELLS) {
    console.warn('[WKDE] Grid too large, adjusting cell size');
    const scale = Math.sqrt((gridWidth * gridHeight) / MAX_CELLS);
    const adjustedCellSize = cellSize * scale;
    return calculateWeightedKDE(points, bandwidth, adjustedCellSize, boundary);
  }

  console.log(`[WKDE] Grid: ${gridWidth}x${gridHeight} cells, boundary: ${parsedBoundary ? 'enabled' : 'disabled'}`);

  // Initialize grid with nulls (will be set to actual values)
  const gridData = new Array(gridWidth * gridHeight).fill(null);

  // Convert points to meter coordinates with weights
  const pointsInMeters = validPoints.map((p) => ({
    x: latLngToMeters(p.lat, p.lng).x,
    y: latLngToMeters(p.lat, p.lng).y,
    weight: p.weight,
  }));

  // Calculate kernel density for each grid cell
  let minValue = Infinity;
  let maxValue = -Infinity;
  let validCells = 0;
  let clippedCells = 0;

  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      // Calculate cell center in meters
      const cellX = minLng + col * cellSize + cellSize / 2;
      const cellY = minLat + row * cellSize + cellSize / 2;

      // Convert to lat/lng for boundary check
      const { lat: cellLat, lng: cellLng } = metersToLatLng(cellX, cellY);

      // Check boundary
      if (parsedBoundary && !isPointInPolygon(cellLat, cellLng, parsedBoundary)) {
        clippedCells++;
        continue; // Leave as null
      }

      // Calculate weighted kernel density
      let density = 0;
      for (const point of pointsInMeters) {
        const distance = Math.sqrt(
          Math.pow(cellX - point.x, 2) + Math.pow(cellY - point.y, 2)
        );
        const kernelWeight = gaussianKernel(distance, bandwidth);
        density += point.weight * kernelWeight;
      }

      // Normalize by bandwidth squared for area consistency
      density = density / (bandwidth * bandwidth);

      gridData[row * gridWidth + col] = density;

      if (density < minValue) minValue = density;
      if (density > maxValue) maxValue = density;
      validCells++;
    }
  }

  // If all cells are masked, return empty result
  if (validCells === 0) {
    console.warn('[WKDE] No valid cells within boundary');
    return { gridData: [], min: 0, max: 0, width: 0, height: 0, bounds: null };
  }

  // Calculate bounds in lat/lng for visualization
  const sw = metersToLatLng(minLng, minLat);
  const ne = metersToLatLng(maxLng, maxLat);

  console.log(
    `[WKDE] Calculated density grid: ${gridWidth}x${gridHeight} cells, ` +
      `valid: ${validCells}, clipped: ${clippedCells}, ` +
      `value range: ${minValue.toFixed(6)} - ${maxValue.toFixed(6)}`
  );

  return {
    gridData,
    min: minValue,
    max: maxValue,
    width: gridWidth,
    height: gridHeight,
    bounds: {
      south: sw.lat,
      west: sw.lng,
      north: ne.lat,
      east: ne.lng,
    },
    cellSize,
  };
}

export { calculateWeightedKDE, normalizeGrid, gaussianKernel };
