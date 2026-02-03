import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import { calculateWeightedKDE, normalizeGrid } from '../../utils/kde.js'

// WKDE default parameters
const DEFAULT_BANDWIDTH = 1000 // meters
const DEFAULT_CELL_SIZE = 100 // meters

// Color ramp: Blue (low) -> Yellow (medium) -> Red (high)
function getColorForValue(value) {
  // value is normalized 0-1
  const v = Math.max(0, Math.min(1, value))

  let r, g, b

  if (v < 0.5) {
    // Blue to Yellow (0 to 0.5)
    const t = v * 2
    // Blue (0, 0, 255) to Yellow (255, 255, 0)
    r = Math.round(0 + t * 255)
    g = Math.round(0 + t * 255)
    b = Math.round(255 - t * 255)
  } else {
    // Yellow to Red (0.5 to 1)
    const t = (v - 0.5) * 2
    // Yellow (255, 255, 0) to Red (255, 0, 0)
    r = Math.round(255)
    g = Math.round(255 - t * 255)
    b = 0
  }

  return [r, g, b]
}

/**
 * Convert grid data to RGBA image data for MapLibre
 * @param {Array} gridData - Normalized grid data (0-1 values)
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {Uint8ClampedArray} RGBA image data
 */
function gridToRGBA(gridData, width, height) {
  const imageData = new Uint8ClampedArray(width * height * 4)

  for (let i = 0; i < gridData.length; i++) {
    const value = gridData[i]
    const col = i % width
    const row = Math.floor(i / width)

    // Flip vertically for correct image orientation
    const pixelIndex = ((height - 1 - row) * width + col) * 4

    if (value === null || value === undefined) {
      // Transparent for masked cells
      imageData[pixelIndex] = 0
      imageData[pixelIndex + 1] = 0
      imageData[pixelIndex + 2] = 0
      imageData[pixelIndex + 3] = 0
    } else {
      const [r, g, b] = getColorForValue(value)
      imageData[pixelIndex] = r
      imageData[pixelIndex + 1] = g
      imageData[pixelIndex + 2] = b
      // Full opacity for valid cells
      imageData[pixelIndex + 3] = 180 // Semi-transparent
    }
  }

  return imageData
}

/**
 * HotspotLayer Component
 * Uses Weighted Kernel Density Estimation (WKDE) for vote density visualization
 * Renders as a raster layer on the map
 */
function HotspotLayer({
  votes = [],
  boundary = null,
  bandwidth = DEFAULT_BANDWIDTH,
  cellSize = DEFAULT_CELL_SIZE,
  showConfidence = false,
  onHotspotClick
}) {
  const map = useMap()
  const layerRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [kdeResult, setKdeResult] = useState(null)

  // Convert votes to weighted points for WKDE
  const weightedPoints = useCallback(() => {
    return votes.map(vote => ({
      lat: vote.lat,
      lng: vote.lng,
      weight: vote.favorability || 1
    }))
  }, [votes])

  // Calculate WKDE when votes or parameters change
  useEffect(() => {
    if (!votes || votes.length === 0) {
      setKdeResult(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('[HotspotLayer] Calculating WKDE with', votes.length, 'votes')
      const points = weightedPoints()

      // Calculate WKDE
      const result = calculateWeightedKDE(points, bandwidth, cellSize, boundary)

      if (result.gridData && result.gridData.length > 0) {
        // Normalize grid data to 0-1 range
        const normalizedGrid = normalizeGrid(result.gridData, result.min, result.max, 0, 1)

        setKdeResult({
          ...result,
          normalizedGrid
        })

        console.log('[HotspotLayer] WKDE calculation complete:', result.width, 'x', result.height)
      } else {
        setKdeResult(null)
        console.warn('[HotspotLayer] No WKDE results returned')
      }
    } catch (err) {
      console.error('[HotspotLayer] WKDE calculation error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [votes, bandwidth, cellSize, boundary, weightedPoints])

  // Cleanup function for both MapLibre and Leaflet
  const cleanupRef = useRef(null)

  // Add/update raster layer on map
  useEffect(() => {
    if (!map || !kdeResult || !map.getContainer) {
      return
    }

    const mapInstance = map // Capture for cleanup
    const sourceId = 'hotspot-kde-source'
    const layerId = 'hotspot-kde-layer'

    // Cleanup previous overlay/layer if exists
    if (cleanupRef.current) {
      if (cleanupRef.current.type === 'maplibre') {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.removeLayer(layerId)
        }
        if (mapInstance.getSource(sourceId)) {
          mapInstance.removeSource(sourceId)
        }
      } else if (cleanupRef.current.type === 'leaflet' && cleanupRef.current.overlay) {
        mapInstance.removeLayer(cleanupRef.current.overlay)
      }
    }

    // Check if maplibre-gl is available
    if (typeof window === 'undefined' || !window.maplibregl) {
      console.warn('[HotspotLayer] MapLibre GL not available, falling back to canvas')
      // Fallback: create canvas overlay using Leaflet
      const overlay = createCanvasOverlay(mapInstance)
      cleanupRef.current = overlay ? { type: 'leaflet', overlay } : null
      return
    }

    const ml = window.maplibregl

    try {
      // Remove existing source and layer if present
      if (mapInstance.getSource(sourceId)) {
        mapInstance.removeLayer(layerId)
        mapInstance.removeSource(sourceId)
      }

      // Convert grid to RGBA image
      const imageData = gridToRGBA(kdeResult.normalizedGrid, kdeResult.width, kdeResult.height)

      // Calculate bounds in lat/lng
      const bounds = kdeResult.bounds
      const corners = [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east]
      ]

      // Add raster source
      mapInstance.addSource(sourceId, {
        type: 'image',
        url: imageDataToDataURL(imageData, kdeResult.width, kdeResult.height),
        coordinates: [
          [bounds.west, bounds.south],
          [bounds.east, bounds.south],
          [bounds.east, bounds.north],
          [bounds.west, bounds.north]
        ]
      })

      // Add raster layer with heatmap-style coloring
      mapInstance.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': 0.7,
          'raster-resampling': 'linear'
        }
      })

      console.log('[HotspotLayer] Added WKDE raster layer')

      return () => {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.removeLayer(layerId)
        }
        if (mapInstance.getSource(sourceId)) {
          mapInstance.removeSource(sourceId)
        }
      }
    } catch (err) {
      console.error('[HotspotLayer] Error adding raster layer:', err)
      cleanupRef.current = null
    }
  }, [kdeResult, map])

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        if (cleanupRef.current.type === 'maplibre') {
          // MapLibre cleanup is handled by individual layer cleanup
        } else if (cleanupRef.current.type === 'leaflet' && cleanupRef.current.overlay && map) {
          try {
            map.removeLayer(cleanupRef.current.overlay)
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
    }
  }, [map])

  // Fallback: Canvas-based overlay for Leaflet
  const overlayRef = useRef(null)
  
  function createCanvasOverlay(mapInstance) {
    if (!kdeResult) return null

    const bounds = kdeResult.bounds
    const canvas = document.createElement('canvas')
    canvas.id = 'hotspot-canvas'
    canvas.width = kdeResult.width
    canvas.height = kdeResult.height
    canvas.style.position = 'absolute'
    canvas.style.pointerEvents = 'none'

    const ctx = canvas.getContext('2d')
    const imageData = ctx.createImageData(kdeResult.width, kdeResult.height)

    const rgbaData = gridToRGBA(kdeResult.normalizedGrid, kdeResult.width, kdeResult.height)
    imageData.data.set(rgbaData)
    ctx.putImageData(imageData, 0, 0)

    // Add to map using Leaflet's ImageOverlay
    const L = window.L
    if (L) {
      const imageBounds = [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east]
      ]

      const overlay = L.imageOverlay(canvas.toDataURL(), imageBounds, {
        opacity: 0.7,
        interactive: false
      })

      overlay.addTo(mapInstance)
      overlayRef.current = overlay
      
      return overlay
    }
    return null
  }

  // Cleanup canvas overlay on unmount
  useEffect(() => {
    return () => {
      if (overlayRef.current && map) {
        map.removeLayer(overlayRef.current)
      }
    }
  }, [map])

  // Convert image data to Data URL for MapLibre
  function imageDataToDataURL(imageData, width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    const imgData = new ImageData(imageData, width, height)
    ctx.putImageData(imgData, 0, 0)

    return canvas.toDataURL('image/png')
  }

  return null // This component doesn't render DOM elements directly
}

/**
 * Alternative: Standalone HotspotLayer with internal MapLibre integration
 * Use this version when the parent component doesn't use react-leaflet
 */
export function HotspotLayerMapLibre({
  votes = [],
  boundary = null,
  bandwidth = DEFAULT_BANDWIDTH,
  cellSize = DEFAULT_CELL_SIZE,
  mapInstance
}) {
  const [kdeResult, setKdeResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Convert votes to weighted points
  const weightedPoints = React.useMemo(() => {
    return votes.map(vote => ({
      lat: vote.lat,
      lng: vote.lng,
      weight: vote.favorability || 1
    }))
  }, [votes])

  // Calculate WKDE
  useEffect(() => {
    if (!votes || votes.length === 0) {
      setKdeResult(null)
      return
    }

    setLoading(true)
    try {
      const result = calculateWeightedKDE(weightedPoints, bandwidth, cellSize, boundary)
      if (result.gridData && result.gridData.length > 0) {
        const normalizedGrid = normalizeGrid(result.gridData, result.min, result.max, 0, 1)
        setKdeResult({ ...result, normalizedGrid })
      }
    } catch (err) {
      console.error('[HotspotLayer] WKDE error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [votes, bandwidth, cellSize, boundary, weightedPoints])

  // Add layer to map
  useEffect(() => {
    if (!mapInstance || !kdeResult) return

    const ml = window.maplibregl
    if (!ml) return

    const sourceId = 'hotspot-kde-source'
    const layerId = 'hotspot-kde-layer'

    try {
      if (mapInstance.getSource(sourceId)) {
        mapInstance.removeLayer(layerId)
        mapInstance.removeSource(sourceId)
      }

      const bounds = kdeResult.bounds
      const imageData = gridToRGBA(kdeResult.normalizedGrid, kdeResult.width, kdeResult.height)

      mapInstance.addSource(sourceId, {
        type: 'image',
        url: imageDataToDataURL(imageData, kdeResult.width, kdeResult.height),
        coordinates: [
          [bounds.west, bounds.south],
          [bounds.east, bounds.south],
          [bounds.east, bounds.north],
          [bounds.west, bounds.north]
        ]
      })

      mapInstance.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': 0.7,
          'raster-resampling': 'linear'
        }
      })

      return () => {
        if (mapInstance.getLayer(layerId)) mapInstance.removeLayer(layerId)
        if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId)
      }
    } catch (err) {
      console.error('[HotspotLayer] Layer error:', err)
    }
  }, [mapInstance, kdeResult])

  return null
}

export default HotspotLayer
