import React, { useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'

/**
 * BoundaryLayer Component
 * Renders Tehran boundary from GeoJSON data with custom styling
 * Non-interactive - just displays the boundary without click/hover events
 */
function BoundaryLayer({ data }) {
  // Style function for the boundary - non-interactive display
  const boundaryStyle = useMemo(() => {
    return {
      color: '#1a5276',
      weight: 3,
      opacity: 1,
      fillColor: 'rgba(26, 82, 118, 0.05)',
      fillOpacity: 0.1,
      lineJoin: 'round',
      lineCap: 'round',
      interactive: false
    }
  }, [])

  // Memoize the GeoJSON component - non-interactive
  const geoJsonComponent = useMemo(() => {
    if (!data || !data.features || data.features.length === 0) {
      return null
    }

    return (
      <GeoJSON
        data={data}
        style={boundaryStyle}
        // No onEachFeature - non-interactive
      />
    )
  }, [data, boundaryStyle])

  return geoJsonComponent
}

export default BoundaryLayer
