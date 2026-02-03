import React from 'react'

/**
 * SelectionButton Component
 * Toggle button for activating/deactivating selection mode
 */
function SelectionButton({ isActive, onClick, disabled }) {
  return (
    <div className="selection-button-container">
      <button
        className={`selection-button ${isActive ? 'active' : ''}`}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={isActive}
        aria-label={isActive ? 'Cancel selection' : 'Select a place on the map'}
      >
        {isActive ? (
          <>
            <span className="icon">&#10005;</span>
            <span>Cancel Selection</span>
          </>
        ) : (
          <>
            <span className="icon">&#10148;</span>
            <span>Select Your Favorite Place</span>
          </>
        )}
        {isActive && (
          <span className="pulse-ring" style={{ position: 'absolute', borderRadius: '9999px' }} />
        )}
      </button>
    </div>
  )
}

export default SelectionButton
