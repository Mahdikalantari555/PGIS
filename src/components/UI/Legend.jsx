import React from 'react'

/**
 * Legend Component
 * Displays map legend with color scale for favorability
 */
function Legend() {
  return (
    <div className="legend-container">
      <div className="legend-title">Legend</div>
      <div className="legend-items">
        <div className="legend-item">
          <div
            className="legend-color-box"
            style={{ backgroundColor: '#1a5276', border: '2px solid #1a5276' }}
          />
          <span>Tehran Boundary</span>
        </div>
        <div className="legend-item">
          <div className="legend-gradient favorability-gradient" />
          <span>Favorability (Low to High)</span>
        </div>
        <div className="legend-labels">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  )
}

export default Legend
