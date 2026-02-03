import React, { useEffect, useMemo } from 'react'
import { useMap, CircleMarker, FeatureGroup, Popup } from 'react-leaflet'
import L from 'leaflet'

/**
 * Get color based on vote score (0-5)
 * Returns a gradient from Red (0) to Green (5)
 * @param {number} score - Vote score (0-5)
 * @returns {string} Color hex code
 */
function getVoteColor(score) {
  // Normalize score to 0-1 range
  const normalized = Math.max(0, Math.min(5, score)) / 5
  
  // HSL: Red (0) to Green (120)
  const hue = normalized * 120
  
  // Convert HSL to hex
  return hslToHex(hue, 80, 50)
}

/**
 * Convert HSL to Hex
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color code
 */
function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  
  let r = 0, g = 0, b = 0
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x
  }
  
  r = Math.round((r + m) * 255).toString(16).padStart(2, '0')
  g = Math.round((g + m) * 255).toString(16).padStart(2, '0')
  b = Math.round((b + m) * 255).toString(16).padStart(2, '0')
  
  return `#${r}${g}${b}`
}

/**
 * Extract vote points from GeoJSON data
 * @param {Object} data - GeoJSON feature collection
 * @returns {Array} Array of {lat, lng, score, name}
 */
function extractVotePoints(data) {
  if (!data || !data.features) return []

  return data.features.map(feature => ({
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
    score: feature.properties.score || 0,
    name: feature.properties.name || feature.properties.user_name || 'Anonymous'
  }))
}

/**
 * VotesLayer Component
 * Renders individual vote points as circle markers with uniform size
 * Color coded by score: Red (low) -> Yellow (medium) -> Green (high)
 */
function VotesLayer({ data, visible = true }) {
  const map = useMap()

  // Extract vote points from GeoJSON data
  const votePoints = useMemo(() => extractVotePoints(data), [data])

  // Create feature group for all markers
  const markers = useMemo(() => {
    if (!visible || !votePoints.length) return null

    return votePoints.map((vote, index) => (
      <CircleMarker
        key={`vote-${index}`}
        center={[vote.lat, vote.lng]}
        radius={6}
        pathOptions={{
          fillColor: getVoteColor(vote.score),
          fillOpacity: 0.9,
          color: '#FFFFFF',
          weight: 1.5,
          interactive: true,
          className: 'vote-marker'
        }}
        eventHandlers={{
          mouseover: (e) => {
            e.target.setStyle({ fillOpacity: 1, weight: 2 })
            e.target._map.getContainer().style.cursor = 'pointer'
          },
          mouseout: (e) => {
            e.target.setStyle({ fillOpacity: 0.9, weight: 1.5 })
            e.target._map.getContainer().style.cursor = ''
          }
        }}
      >
        <Popup>
          <div className="vote-popup-content">
            <strong>{vote.name}</strong><br/>
            Score: {vote.score}
          </div>
        </Popup>
      </CircleMarker>
    ))
  }, [votePoints, visible])

  useEffect(() => {
    if (!map || !markers) return

    const layerGroup = L.layerGroup()
    markers.forEach(marker => {
      if (marker.leafletElement) {
        layerGroup.addLayer(marker.leafletElement)
      }
    })

    layerGroup.addTo(map)

    return () => {
      if (map.hasLayer(layerGroup)) {
        map.removeLayer(layerGroup)
      }
    }
  }, [map, markers])

  // If using FeatureGroup approach, render it
  if (!visible || !votePoints.length) {
    return null
  }

  return (
    <FeatureGroup>
      {markers}
    </FeatureGroup>
  )
}

export default VotesLayer
