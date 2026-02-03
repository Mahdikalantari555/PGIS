import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BoundaryLayer from './BoundaryLayer'
import HotspotLayer from './HotspotLayer'
import FavoribilityLayer from './FavoribilityLayer'
import VotesLayer from './VotesLayer'

// Tehran center coordinates
const TEHRAN_CENTER = [35.6892, 51.3890]
const TEHRAN_ZOOM = 12

// Hotspot layer default parameters
const DEFAULT_BANDWIDTH = 1000 // meters
const DEFAULT_CELL_SIZE = 100 // meters
const MIN_BANDWIDTH = 500
const MAX_BANDWIDTH = 2000
const MIN_CELL_SIZE = 50
const MAX_CELL_SIZE = 200

/**
 * Extract hotspot points from GeoJSON data
 * @param {Object} data - GeoJSON feature collection
 * @returns {Array} Array of {lat, lng, favorability}
 */
function extractHotspotPoints(data) {
  if (!data || !data.features || data.features.length === 0) {
    return []
  }

  return data.features.map(feature => ({
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
    favorability: feature.properties.score || 0
  }))
}

/**
 * Map click handler component for selection mode
 */
function MapClickHandler({ isSelectionMode, onMapClick, boundaryData }) {
  useMapEvents({
    click: (e) => {
      if (isSelectionMode) {
        onMapClick(e.latlng)
      }
    }
  })
  
  return null
}

/**
 * Selection cursor handler - shows pointer cursor when in selection mode
 * and mouse is within the boundary
 */
function SelectionCursorHandler({ isSelectionMode, boundaryData }) {
  const map = useMap()

  useEffect(() => {
    if (!isSelectionMode || !map || !boundaryData) {
      // Reset cursor when not in selection mode
      map.getContainer().style.cursor = ''
      return
    }

    const handleMouseMove = (e) => {
      const { lat, lng } = e.latlng

      // Check if point is within boundary
      let isInside = false
      
      if (boundaryData && boundaryData.features) {
        try {
          const pt = L.latLng(lat, lng)
          
          for (const feature of boundaryData.features) {
            const layer = L.geoJSON(feature)
            if (layer.getLayers().some(l => l.getBounds().contains(pt))) {
              isInside = true
              break
            }
          }
        } catch (err) {
          // Fallback: check using simpler bounds
          try {
            const layer = L.geoJSON(boundaryData)
            const bounds = layer.getBounds()
            isInside = bounds.contains([lat, lng])
          } catch (e) {
            isInside = true // Allow on error
          }
        }
      } else {
        isInside = true
      }

      // Set cursor based on whether inside boundary
      map.getContainer().style.cursor = isInside ? 'pointer' : 'not-allowed'
    }

    const handleMouseLeave = () => {
      map.getContainer().style.cursor = ''
    }

    map.on('mousemove', handleMouseMove)
    map.on('mouseout', handleMouseLeave)

    return () => {
      map.off('mousemove', handleMouseMove)
      map.off('mouseout', handleMouseLeave)
      map.getContainer().style.cursor = ''
    }
  }, [isSelectionMode, map, boundaryData])

  return null
}

/**
 * Fit bounds to Tehran boundary
 */
function BoundsController({ boundaryData }) {
  const map = useMap()
  
  useEffect(() => {
    if (boundaryData && boundaryData.features && boundaryData.features.length > 0) {
      try {
        const layer = L.geoJSON(boundaryData)
        const bounds = layer.getBounds()
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] })
        }
      } catch (error) {
        console.error('[TehranMap] Error fitting bounds:', error)
      }
    }
  }, [boundaryData, map])
  
  return null
}

/**
 * Hotspot Controls Component
 * Provides UI for toggling hotspot layer and adjusting parameters
 */
function HotspotControls({
  isVisible,
  onToggleVisibility,
  bandwidth,
  onBandwidthChange,
  cellSize,
  onCellSizeChange
}) {
  return (
    <div className="hotspot-controls">
      <div className="hotspot-control-row">
        <label className="hotspot-toggle">
          <input
            type="checkbox"
            checked={isVisible}
            onChange={(e) => onToggleVisibility(e.target.checked)}
          />
          <span>Show Hotspots</span>
        </label>
      </div>
      
      {isVisible && (
        <>
          <div className="hotspot-control-row">
            <label>
              Bandwidth: {bandwidth}m
              <input
                type="range"
                min={MIN_BANDWIDTH}
                max={MAX_BANDWIDTH}
                value={bandwidth}
                onChange={(e) => onBandwidthChange(parseInt(e.target.value, 10))}
              />
            </label>
          </div>
          
          <div className="hotspot-control-row">
            <label>
              Cell Size: {cellSize}m
              <input
                type="range"
                min={MIN_CELL_SIZE}
                max={MAX_CELL_SIZE}
                value={cellSize}
                onChange={(e) => onCellSizeChange(parseInt(e.target.value, 10))}
              />
            </label>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Hotspot Legend Component
 * Displays color scale for hotspot visualization
 */
function HotspotLegend() {
  return (
    <div className="hotspot-legend">
      <div className="hotspot-legend-title">Vote Density</div>
      <div className="hotspot-legend-gradient" />
      <div className="hotspot-legend-labels">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  )
}

/**
 * Main Tehran Map Component
 */
function TehranMap({
  isSelectionMode,
  onMapClick,
  boundaryData: propBoundaryData,
  hotspotData,
  onHotspotClick,
  baseMapType = 'osm',
  isFavoribilityEnabled = false,
  isVotesEnabled = true
}) {
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef(null)
  
  // Local state for boundary data (fetch if not provided)
  const [boundaryData, setBoundaryData] = useState(propBoundaryData || null)
  
  // Hotspot layer state
  const [isHotspotVisible, setIsHotspotVisible] = useState(false)
  const [bandwidth, setBandwidth] = useState(DEFAULT_BANDWIDTH)
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE)
  
  // OSM tile layer configuration
  const osmTileLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const osmTileLayerAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

  // Google Satellite tile layer configuration
  const satelliteTileLayerUrl = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
  const satelliteTileLayerAttribution = '&copy; <a href="https://www.google.com/maps">Google Maps</a>'

  // Google Satellite Hybrid tile layer configuration
  const hybridTileLayerUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
  const hybridTileLayerAttribution = '&copy; <a href="https://www.google.com/maps">Google Maps</a>'

  // Select tile layer based on baseMapType
  const isSatellite = baseMapType === 'satellite'
  const isHybrid = baseMapType === 'hybrid'
  const currentTileUrl = isHybrid ? hybridTileLayerUrl : (isSatellite ? satelliteTileLayerUrl : osmTileLayerUrl)
  const currentAttribution = isHybrid ? hybridTileLayerAttribution : (isSatellite ? satelliteTileLayerAttribution : osmTileLayerAttribution)
  const currentMaxZoom = isHybrid || isSatellite ? 21 : 19
  
  // Extract votes array from hotspotData GeoJSON
  const votes = useMemo(() => {
    return extractHotspotPoints(hotspotData)
  }, [hotspotData])
  
  // Fetch boundary data if not provided via props
  useEffect(() => {
    if (propBoundaryData) {
      setBoundaryData(propBoundaryData)
      return
    }
    
    async function loadBoundary() {
      try {
        console.log('[TehranMap] Loading boundary from public/tehran_bound.geojson')
        const response = await fetch('/tehran_bound.geojson')
        if (!response.ok) {
          throw new Error('Failed to load boundary data')
        }
        const data = await response.json()
        setBoundaryData(data)
        console.log('[TehranMap] Boundary loaded successfully')
      } catch (error) {
        console.error('[TehranMap] Error loading boundary:', error)
      }
    }
    
    loadBoundary()
  }, [propBoundaryData])
  
  // Log when votes change
  useEffect(() => {
    console.log('[TehranMap] Votes extracted:', votes.length, 'points')
  }, [votes])
  
  return (
    <div className="map-container" style={{ width: '100%', height: '100%' }}>
      <MapContainer
        ref={mapRef}
        center={TEHRAN_CENTER}
        zoom={TEHRAN_ZOOM}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={true}
        whenReady={() => setMapReady(true)}
      >
        {/* Base Tile Layer - OSM or Satellite */}
        <TileLayer
          url={currentTileUrl}
          attribution={currentAttribution}
          maxZoom={currentMaxZoom}
        />

        {/* Tehran Boundary Layer */}
        <BoundaryLayer data={boundaryData} />

        {/* Hotspot Visualization Layer */}
        {isHotspotVisible && votes.length > 0 && (
          <HotspotLayer
            votes={votes}
            boundary={boundaryData}
            bandwidth={bandwidth}
            cellSize={cellSize}
            onHotspotClick={onHotspotClick}
          />
        )}

        {/* Favoribility Layer (when enabled) */}
        {isFavoribilityEnabled && (
          <FavoribilityLayer data={hotspotData} boundaryData={boundaryData} />
        )}

        {/* Votes Layer (when enabled) */}
        {isVotesEnabled && (
          <VotesLayer data={hotspotData} visible={isVotesEnabled} />
        )}

        {/* Map Click Handler for Selection Mode */}
        <MapClickHandler
          isSelectionMode={isSelectionMode}
          onMapClick={onMapClick}
          boundaryData={boundaryData}
        />

        {/* Selection Cursor Handler */}
        <SelectionCursorHandler
          isSelectionMode={isSelectionMode}
          boundaryData={boundaryData}
        />

        {/* Fit to boundary when loaded */}
        <BoundsController boundaryData={boundaryData} />
      </MapContainer>
      
      {/* Hotspot Layer Controls */}
      <HotspotControls
        isVisible={isHotspotVisible}
        onToggleVisibility={setIsHotspotVisible}
        bandwidth={bandwidth}
        onBandwidthChange={setBandwidth}
        cellSize={cellSize}
        onCellSizeChange={setCellSize}
      />
      
      {/* Hotspot Legend */}
      {isHotspotVisible && votes.length > 0 && (
        <HotspotLegend />
      )}
    </div>
  )
}

export default TehranMap
