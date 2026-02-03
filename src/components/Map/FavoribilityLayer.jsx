import React, { useEffect, useMemo, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

/**
 * Get color based on favorability score (0-5)
 */
function getFavoribilityColorRGB(score) {
  const normalizedScore = Math.max(0, Math.min(1, score / 5))

  let r, g, b

  if (normalizedScore < 0.5) {
    const t = normalizedScore * 2
    r = 255
    g = Math.round(68 + t * (221 - 68))
    b = Math.round(68 * (1 - t))
  } else {
    const t = (normalizedScore - 0.5) * 2
    r = Math.round(255 - t * (255 - 68))
    g = 221
    b = Math.round(t * (68))
  }

  return `rgb(${r},${g},${b})`
}

/**
 * Get simplified hotspot data from GeoJSON features
 */
function extractHotspotPoints(data) {
  if (!data || !data.features) return []

  return data.features.map(feature => ({
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
    score: feature.properties.score || 0
  }))
}

/**
 * Extract coordinates from boundary GeoJSON
 */
function extractBoundaryCoordinates(boundaryData) {
  if (!boundaryData || !boundaryData.features) return []

  const coords = []
  for (const feature of boundaryData.features) {
    if (feature.geometry.type === 'MultiPolygon') {
      for (const polygon of feature.geometry.coordinates) {
        for (const ring of polygon) {
          coords.push(ring)
        }
      }
    } else if (feature.geometry.type === 'Polygon') {
      for (const ring of feature.geometry.coordinates) {
        coords.push(ring)
      }
    }
  }
  return coords
}

/**
 * IDW interpolation
 */
function quickIDW(lat, lng, points, power = 2) {
  if (!points || points.length === 0) return 0

  let numerator = 0
  let denominator = 0

  for (const point of points) {
    const distance = Math.sqrt(
      Math.pow(lat - point.lat, 2) + Math.pow(lng - point.lng, 2)
    )

    if (distance < 0.0001) {
      return point.score
    }

    const weight = 1 / Math.pow(distance, power)
    numerator += weight * point.score
    denominator += weight
  }

  return denominator > 0 ? numerator / denominator : 0
}

/**
 * Ray casting for point-in-polygon
 */
function isPointInBoundary(lat, lng, boundaryCoords) {
  let inside = false
  const n = boundaryCoords.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = boundaryCoords[i][0]
    const yi = boundaryCoords[i][1]
    const xj = boundaryCoords[j][0]
    const yj = boundaryCoords[j][1]

    const intersect =
      ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)

    if (intersect) inside = !inside
  }

  return inside
}

/**
 * FavoribilityLayer Component - Canvas-based
 */
function FavoribilityLayer({ data, boundaryData }) {
  const map = useMap()
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)

  // Extract hotspot points and boundary coordinates
  const hotspotPoints = useMemo(() => extractHotspotPoints(data), [data])
  const boundaryCoords = useMemo(() => extractBoundaryCoordinates(boundaryData), [boundaryData])

  // Create canvas and render
  const render = useCallback(() => {
    if (!map || !hotspotPoints.length || !boundaryCoords.length) {
      return
    }

    // Calculate bounds from boundary GeoJSON
    let minLat = Infinity, maxLat = -Infinity
    let minLng = Infinity, maxLng = -Infinity

    for (const ring of boundaryCoords) {
      for (const [lng, lat] of ring) {
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
      }
    }

    // Add small padding
    const latPadding = (maxLat - minLat) * 0.01
    const lngPadding = (maxLng - minLng) * 0.01
    minLat -= latPadding
    maxLat += latPadding
    minLng -= lngPadding
    maxLng += lngPadding

    // Create canvas
    let canvas = canvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvasRef.current = canvas
    }

    // Fixed canvas size for consistent resolution
    const width = 1200
    const height = Math.round(width * (maxLat - minLat) / (maxLng - minLng))
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)

    const imageData = ctx.createImageData(width, height)
    const data = imageData.data

    const latStep = (maxLat - minLat) / height
    const lngStep = (maxLng - minLng) / width

    // Process each pixel
    for (let py = 0; py < height; py++) {
      const lat = maxLat - py * latStep

      for (let px = 0; px < width; px++) {
        const lng = minLng + px * lngStep

        // Check boundary
        let inside = false
        for (const ring of boundaryCoords) {
          if (isPointInBoundary(lat, lng, ring)) {
            inside = true
            break
          }
        }

        const pixelIndex = (py * width + px) * 4

        if (inside) {
          const favorability = quickIDW(lat, lng, hotspotPoints, 2)
          const color = getFavoribilityColorRGB(favorability)
          const match = color.match(/\d+/g)
          if (match) {
            data[pixelIndex] = parseInt(match[0])
            data[pixelIndex + 1] = parseInt(match[1])
            data[pixelIndex + 2] = parseInt(match[2])
            data[pixelIndex + 3] = 220 // 85% opacity
          }
        } else {
          data[pixelIndex + 3] = 0 // Transparent
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)

    // Create or update ImageOverlay
    const imageBounds = [
      [minLat, minLng],
      [maxLat, maxLng]
    ]

    if (overlayRef.current) {
      map.removeLayer(overlayRef.current)
    }

    overlayRef.current = L.imageOverlay(canvas.toDataURL('image/png'), imageBounds, {
      opacity: 1,
      interactive: false
    })

    overlayRef.current.addTo(map)
    console.log('[FavoribilityLayer] Canvas overlay added for full boundary')
  }, [map, hotspotPoints, boundaryCoords])

  // Main render effect
  useEffect(() => {
    if (!map || !hotspotPoints.length || !boundaryCoords.length) {
      return
    }

    console.log('[FavoribilityLayer] Starting canvas render')
    render()

    return () => {
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current)
      }
    }
  }, [map, hotspotPoints, boundaryCoords, render])

  return null
}

export default FavoribilityLayer
