import React from 'react'

/**
 * Favoribility Toggle Component
 * Toggles the favoribility layer visibility
 */
function FavoribilityToggle({ isEnabled, onToggle }) {
  return (
    <div className="favoribility-toggle">
      <button
        className={`favoribility-btn ${isEnabled ? 'active' : ''}`}
        onClick={() => onToggle(!isEnabled)}
        title="Toggle Favoribility Layer"
      >
        <span className="favoribility-icon">📊</span>
        <span className="favoribility-label">
          {isEnabled ? '[ON]' : '[OFF]'}
        </span>
        <span className="favoribility-text">Favorability</span>
      </button>
    </div>
  )
}

export default FavoribilityToggle
