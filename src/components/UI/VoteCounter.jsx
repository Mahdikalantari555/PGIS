import React from 'react'

/**
 * VoteCounter Component
 * Displays the total number of votes submitted
 */
function VoteCounter({ count }) {
  return (
    <div className="vote-counter-container">
      <span className="vote-counter-label">Votes:</span>
      <span className="vote-counter-value">{count}</span>
    </div>
  )
}

export default VoteCounter
