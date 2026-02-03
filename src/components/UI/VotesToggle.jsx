import React from 'react'

/**
 * VotesToggle Component
 * Small toggle button for votes layer visibility - shows ON/OFF
 */
function VotesToggle({ isEnabled, onToggle }) {
  return (
    <button
      className={`votes-toggle ${isEnabled ? 'active' : ''}`}
      onClick={() => onToggle(!isEnabled)}
      title="Toggle Votes"
    >
      {isEnabled ? 'ON' : 'OFF'}
    </button>
  )
}

export default VotesToggle
