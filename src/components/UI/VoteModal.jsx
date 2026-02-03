import React, { useState, useEffect, useRef } from 'react'

/**
 * Get background color based on score
 * Red (0) to Green (5) gradient matching vote layer
 * @param {number} score - Favorability score (0-5)
 * @returns {string} CSS color value
 */
function getScoreColor(score) {
  const colors = ['#ff0000', '#cc6600', '#999900', '#66cc00', '#33ff00', '#00ff00'];
  return colors[Math.round(score)] || colors[3];
}

/**
 * VoteModal Component
 * Modal form for submitting a vote
 */
function VoteModal({ isOpen, onClose, onSubmit, selectedLocation, isSubmitting }) {
  const [userName, setUserName] = useState('')
  const [score, setScore] = useState(3)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  // Focus on name input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100)
    }
  }, [isOpen])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUserName('')
      setScore(3)
      setError('')
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate
    if (!userName.trim()) {
      setError('Please enter your name')
      return
    }

    if (userName.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return
    }

    if (score < 0 || score > 5) {
      setError('Please select a valid score')
      return
    }

    // Submit vote
    onSubmit({
      userName: userName.trim(),
      score: score,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    })
  }

  const handleCancel = () => {
    setError('')
    onClose()
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleCancel()
    }
  }

  if (!isOpen) {
    return null
  }

  const scoreColor = getScoreColor(score)

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h3 id="modal-title">Rate This Location</h3>
          <button 
            className="modal-close" 
            onClick={handleCancel}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-coordinates">
          Location: {selectedLocation?.lat?.toFixed(4)}, {selectedLocation?.lng?.toFixed(4)}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="userName" className="form-label">
              Your Name
            </label>
            <input
              ref={inputRef}
              id="userName"
              type="text"
              className="form-input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              disabled={isSubmitting}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="score" className="form-label">
              Favorability Score
            </label>
            
            <div className="slider-container">
              <div className="slider-labels">
                <span>Low (0)</span>
                <span>High (5)</span>
              </div>
              
              <div className="slider-track">
                <input
                  id="score"
                  type="range"
                  className="slider-input"
                  min="0"
                  max="5"
                  step="1"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  disabled={isSubmitting}
                  aria-label="Favorability score"
                />
              </div>
              
              <div className="slider-value">
                <div 
                  className="slider-value-circle"
                  style={{ backgroundColor: scoreColor }}
                >
                  {score}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn modal-btn-cancel"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Vote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VoteModal
