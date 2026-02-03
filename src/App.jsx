import React, { useState, useEffect, useCallback } from 'react'
import './App.css'
import TehranMap from './components/Map/TehranMap'
import Header from './components/UI/Header'
import SelectionButton from './components/UI/SelectionButton'
import StatusMessage from './components/UI/StatusMessage'
import VoteModal from './components/UI/VoteModal'
import Legend from './components/UI/Legend'
import VoteCounter from './components/UI/VoteCounter'
import BasemapToggle from './components/UI/BasemapToggle'
import FavoribilityToggle from './components/UI/FavoribilityToggle'
import VotesToggle from './components/UI/VotesToggle'
import { isSupabaseConfigured, getSupabaseConfigStatus, testConnection, fetchAllVotes, submitVote } from './services/supabase'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'

/**
 * Main Application Component
 * Manages application state and coordinates all components
 */
function App() {
  // Data state
  const [boundaryData, setBoundaryData] = useState(null)
  const [hotspotData, setHotspotData] = useState({ type: 'FeatureCollection', features: [] })
  const [voteCount, setVoteCount] = useState(0)

  // UI state
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Status state
  const [status, setStatus] = useState({ type: '', message: '', show: false })
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [configWarning, setConfigWarning] = useState(false)

  // Basemap state
  const [baseMapType, setBaseMapType] = useState('hybrid')

  // Favoribility layer state
  const [isFavoribilityEnabled, setIsFavoribilityEnabled] = useState(false)

  // Votes layer state
  const [isVotesEnabled, setIsVotesEnabled] = useState(true)

  // Load boundary data
  useEffect(() => {
    async function loadBoundary() {
      try {
        console.log('[App] Loading Tehran boundary...')
        const response = await fetch('/tehran_bound.geojson')
        if (!response.ok) {
          throw new Error('Failed to load boundary data')
        }
        const data = await response.json()
        setBoundaryData(data)
        console.log('[App] Boundary loaded successfully')
      } catch (error) {
        console.error('[App] Error loading boundary:', error)
        setStatus({
          type: 'error',
          message: 'Failed to load Tehran boundary data',
          show: true
        })
      }
    }
    loadBoundary()
  }, [])

  // Check Supabase configuration and load initial data
  useEffect(() => {
    async function initializeApp() {
      setIsLoading(true)

      // Check configuration
      const configured = isSupabaseConfigured()
      setIsConfigured(configured)

      if (!configured) {
        const configStatus = getSupabaseConfigStatus()
        console.warn('[App] Supabase not configured:', configStatus)
        setConfigWarning(true)
        setIsLoading(false)
        return
      }

      // Test connection and load initial votes
      let connected = false
      try {
        connected = await testConnection()
        if (!connected) {
          console.warn('[App] Supabase connection failed')
          setStatus({
            type: 'error',
            message: 'Failed to connect to database. Please check configuration.',
            show: true
          })
        }
      } catch (error) {
        console.error('[App] Connection test error:', error)
      }

      // Only load votes if connection was successful
      if (connected) {
        await loadVotes()
      }
      setIsLoading(false)
    }

    initializeApp()
  }, [])

  // Load votes from Supabase
  const loadVotes = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return
    }

    try {
      console.log('[App] Loading votes...')
      const result = await fetchAllVotes()
      
      if (result.success) {
        setHotspotData(result.votes)
        const count = result.votes.features?.length || 0
        setVoteCount(count)
        console.log(`[App] Loaded ${count} votes`)
      } else {
        console.error('[App] Failed to load votes:', result.error)
        setStatus({
          type: 'warning',
          message: 'Failed to load votes. Some features may be unavailable.',
          show: true
        })
      }
    } catch (error) {
      console.error('[App] Load votes error:', error)
    }
  }, [])

  // Check if point is within Tehran boundary
  const isPointInBoundary = useCallback((lat, lng) => {
    if (!boundaryData || !boundaryData.features || boundaryData.features.length === 0) {
      // If no boundary data, allow the selection
      return true
    }

    try {
      const pt = point([lng, lat])
      for (const feature of boundaryData.features) {
        if (booleanPointInPolygon(pt, feature)) {
          return true
        }
      }
      return false
    } catch (error) {
      console.error('[App] Boundary check error:', error)
      // Allow on error
      return true
    }
  }, [boundaryData])

  // Handle map click
  const handleMapClick = useCallback((latlng) => {
    if (!isSelectionMode) {
      return
    }

    console.log('[App] Map clicked:', latlng)

    // Check if point is within boundary
    if (!isPointInBoundary(latlng.lat, latlng.lng)) {
      setStatus({
        type: 'warning',
        message: 'Please select a location within Tehran\'s boundaries',
        show: true
      })
      // Clear warning after 3 seconds
      setTimeout(() => {
        setStatus(prev => ({ ...prev, show: false }))
      }, 3000)
      return
    }

    // Open vote modal
    setSelectedLocation(latlng)
    setShowModal(true)
    setIsSelectionMode(false)
  }, [isSelectionMode, isPointInBoundary])

  // Handle vote submission
  const handleVoteSubmit = async (voteData) => {
    if (!isSupabaseConfigured()) {
      setStatus({
        type: 'error',
        message: 'Cannot submit vote: Supabase not configured',
        show: true
      })
      return
    }

    setIsSubmitting(true)
    console.log('[App] Submitting vote:', voteData)

    try {
      const result = await submitVote(
        voteData.userName,
        voteData.score,
        voteData.lng,
        voteData.lat
      )

      if (result.success) {
        // Update hotspots with new data
        if (result.votes) {
          setHotspotData(result.votes)
          setVoteCount(result.votes.features?.length || 0)
        }

        setStatus({
          type: 'success',
          message: 'Vote submitted successfully!',
          show: true
        })

        // Close modal
        setShowModal(false)
        setSelectedLocation(null)

        // Clear success message after 3 seconds
        setTimeout(() => {
          setStatus(prev => ({ ...prev, show: false }))
        }, 3000)
      } else {
        setStatus({
          type: 'error',
          message: result.error || 'Failed to submit vote',
          show: true
        })
      }
    } catch (error) {
      console.error('[App] Submit vote error:', error)
      setStatus({
        type: 'error',
        message: 'An error occurred while submitting your vote',
        show: true
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle selection mode toggle
  const handleSelectionToggle = () => {
    setIsSelectionMode(prev => !prev)
    
    if (!isSelectionMode) {
      setStatus({
        type: 'info',
        message: 'Click on the map to select a location for your vote',
        show: true
      })
    } else {
      setStatus(prev => ({ ...prev, show: false }))
    }
  }

  // Handle modal close
  const handleModalClose = () => {
    if (!isSubmitting) {
      setShowModal(false)
      setSelectedLocation(null)
    }
  }

  // Handle hotspot click (view existing vote)
  const handleHotspotClick = (feature) => {
    console.log('[App] Hotspot clicked:', feature)
    // Could show vote details in a popup or side panel
  }

  // Handle basemap toggle
  const handleBaseMapToggle = (type) => {
    setBaseMapType(type)
    console.log('[App] Basemap changed to:', type)
  }

  // Handle favoribility toggle
  const handleFavoribilityToggle = (enabled) => {
    setIsFavoribilityEnabled(enabled)
    console.log('[App] Favoribility layer:', enabled ? 'enabled' : 'disabled')
  }

  // Handle votes toggle
  const handleVotesToggle = (enabled) => {
    setIsVotesEnabled(enabled)
    console.log('[App] Votes layer:', enabled ? 'enabled' : 'disabled')
  }

  return (
    <div className="app-container">
      {/* Header */}
      <Header />

      {/* Map */}
      <div className="map-wrapper">
        <TehranMap
          isSelectionMode={isSelectionMode}
          onMapClick={handleMapClick}
          boundaryData={boundaryData}
          hotspotData={hotspotData}
          onHotspotClick={handleHotspotClick}
          baseMapType={baseMapType}
          isFavoribilityEnabled={isFavoribilityEnabled}
          isVotesEnabled={isVotesEnabled}
        />
      </div>

      {/* Selection Button */}
      <SelectionButton
        isActive={isSelectionMode}
        onClick={handleSelectionToggle}
        disabled={!isConfigured || isLoading}
      />

      {/* Status Message */}
      <StatusMessage
        type={status.type}
        message={status.message}
        show={status.show}
      />

      {/* Legend */}
      <Legend />

      {/* Vote Counter */}
      <VoteCounter count={voteCount} />

      {/* Votes Toggle */}
      <VotesToggle isEnabled={isVotesEnabled} onToggle={handleVotesToggle} />

      {/* Basemap Toggle */}
      <BasemapToggle baseMapType={baseMapType} onToggle={handleBaseMapToggle} />

      {/* Favoribility Toggle */}
      <FavoribilityToggle isEnabled={isFavoribilityEnabled} onToggle={handleFavoribilityToggle} />

      {/* Vote Modal */}
      <VoteModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSubmit={handleVoteSubmit}
        selectedLocation={selectedLocation}
        isSubmitting={isSubmitting}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p className="loading-text">Loading application...</p>
        </div>
      )}

      {/* Configuration Warning */}
      {configWarning && (
        <div className="config-warning">
          <h3>Configuration Required</h3>
          <p>To enable voting functionality, please configure your Supabase credentials.</p>
          <p>Add the following to your <code>.env</code> file:</p>
          <code>
            VITE_SUPABASE_URL=your_supabase_url<br />
            VITE_SUPABASE_ANON_KEY=your_anon_key
          </code>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6c757d' }}>
            The map will still work, but you won't be able to submit votes without Supabase configuration.
          </p>
          <button 
            className="modal-btn modal-btn-submit" 
            style={{ marginTop: '1rem' }}
            onClick={() => setConfigWarning(false)}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

export default App
