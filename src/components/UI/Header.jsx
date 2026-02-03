import React from 'react'

/**
 * Header Component
 * Professional branding header for the application
 */
function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-logo">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div className="header-text">
          <h1>Favorability Hotspot Map</h1>
          <p className="subtitle">Vote for your favorite places in Tehran</p>
        </div>
      </div>
    </header>
  )
}

export default Header
