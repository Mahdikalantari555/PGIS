/**
 * Web Worker for favoribility IDW calculation
 */

// IDW interpolation function
function idwInterpolate(lat, lng, points, power = 2) {
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

// Ray casting for point-in-polygon
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

// Process message from main thread
self.onmessage = function(e) {
  const { 
    type, 
    points, 
    boundaryCoords, 
    bounds, 
    resolution 
  } = e.data

  if (type === 'compute') {
    const latStep = (bounds.north - bounds.south) / resolution
    const lngStep = (bounds.east - bounds.west) / resolution
    const resolutionPlusOne = resolution + 1

    const cells = []

    for (let i = 0; i < resolutionPlusOne; i++) {
      // Report progress every 10%
      if (i % Math.floor(resolutionPlusOne / 10) === 0) {
        self.postMessage({
          type: 'progress',
          progress: Math.round((i / resolutionPlusOne) * 100)
        })
      }

      for (let j = 0; j < resolutionPlusOne; j++) {
        const lat = bounds.south + i * latStep
        const lng = bounds.west + j * lngStep

        // Check boundary
        let inside = false
        for (const ring of boundaryCoords) {
          if (isPointInBoundary(lat, lng, ring)) {
            inside = true
            break
          }
        }

        if (inside) {
          const favorability = idwInterpolate(lat, lng, points, 2)
          cells.push({
            lat,
            lng,
            latStep,
            lngStep,
            favorability
          })
        }
      }
    }

    // Send complete message with cells
    self.postMessage({
      type: 'complete',
      cells
    })
  }
}
