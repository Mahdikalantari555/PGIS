import React from 'react'

/**
 * StatusMessage Component
 * Displays notifications and feedback messages
 */
function StatusMessage({ type = 'info', message, show }) {
  if (!show || !message) {
    return null
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '&#10003;'
      case 'warning':
        return '&#9888;'
      case 'error':
        return '&#10007;'
      case 'info':
      default:
        return '&#9432;'
    }
  }

  return (
    <div className="status-message-container">
      <div className={`status-message ${type}`}>
        <span 
          className="status-icon" 
          dangerouslySetInnerHTML={{ __html: getIcon() }} 
        />
        <span>{message}</span>
      </div>
    </div>
  )
}

export default StatusMessage
