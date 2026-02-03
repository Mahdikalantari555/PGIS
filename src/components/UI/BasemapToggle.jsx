import React from 'react'

/**
 * Basemap Toggle Component
 * Toggles between OSM, Satellite, and Hybrid basemaps
 */
function BasemapToggle({ baseMapType, onToggle }) {
  return (
    <div className="basemap-toggle">
      <button
        className={`basemap-btn ${baseMapType === 'osm' ? 'active' : ''}`}
        onClick={() => onToggle('osm')}
        title="OpenStreetMap"
      >
        <span className="basemap-icon">🗺️</span>
        <span className="basemap-label">Map</span>
      </button>
      <button
        className={`basemap-btn ${baseMapType === 'satellite' ? 'active' : ''}`}
        onClick={() => onToggle('satellite')}
        title="Google Satellite"
      >
        <span className="basemap-icon">🛰️</span>
        <span className="basemap-label">Satellite</span>
      </button>
      <button
        className={`basemap-btn ${baseMapType === 'hybrid' ? 'active' : ''}`}
        onClick={() => onToggle('hybrid')}
        title="Google Satellite Hybrid"
      >
        <span className="basemap-icon">🌐</span>
        <span className="basemap-label">Hybrid</span>
      </button>
    </div>
  )
}

export default BasemapToggle
