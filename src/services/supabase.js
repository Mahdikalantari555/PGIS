/**
 * Supabase Service Module
 * Handles all Supabase interactions for votes
 */

import { createClient } from '@supabase/supabase-js'

// Environment variable keys
const SUPABASE_URL_KEY = 'VITE_SUPABASE_URL'
const SUPABASE_ANON_KEY = 'VITE_SUPABASE_ANON_KEY'

// Supabase client
let supabaseClient = null

/**
 * Get Supabase URL from environment variables
 * @returns {string} Supabase project URL
 */
export function getSupabaseUrl() {
  return import.meta.env?.[SUPABASE_URL_KEY] || ''
}

/**
 * Get Supabase anonymous key from environment variables
 * @returns {string} Supabase anonymous key
 */
export function getSupabaseAnonKey() {
  return import.meta.env?.[SUPABASE_ANON_KEY] || ''
}

/**
 * Check if Supabase is configured
 * @returns {boolean} True if both URL and key are present
 */
export function isSupabaseConfigured() {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  return !!(url && key && url.length > 0 && key.length > 0)
}

/**
 * Get Supabase configuration status
 * @returns {Object} Configuration status
 */
export function getSupabaseConfigStatus() {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()

  return {
    configured: !!(url && key),
    hasUrl: !!url,
    hasKey: !!key,
    urlPrefix: url ? url.split('.')[0] : ''
  }
}

/**
 * Validate Supabase URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid format
 */
export function isValidSupabaseUrl(url) {
  if (!url) return false
  // Check for standard Supabase URL pattern
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)
}

/**
 * Initialize or get Supabase client
 * @returns {Object} Supabase client instance
 */
function getClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = getSupabaseUrl()
  const supabaseKey = getSupabaseAnonKey()

  if (!supabaseUrl || !supabaseKey) {
    console.error('[SupabaseService] Supabase credentials not configured')
    throw new Error('Supabase credentials not configured')
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey)
  console.log('[SupabaseService] Supabase client initialized')
  return supabaseClient
}

/**
 * Submit a new vote
 * @param {string} userName - User's name
 * @param {number} score - Favorability score (0-5)
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @returns {Promise<Object>} Result object
 */
export async function submitVote(userName, score, lng, lat) {
  console.log('[SupabaseService] Submitting vote:', { userName, score, lng, lat })

  try {
    const client = getClient()

    // Create WKT geometry point
    const geom = `SRID=4326;POINT(${lng} ${lat})`

    // Insert vote
    const { data, error } = await client
      .from('votes')
      .insert({
        user_name: userName,
        score: score,
        geom: geom
      })
      .select()
      .single()

    if (error) {
      console.error('[SupabaseService] Insert error:', error)
      return { success: false, error: error.message }
    }

    console.log('[SupabaseService] Vote inserted:', data)

    // Fetch all votes for hotspot update
    const votesResult = await fetchAllVotes()
    if (!votesResult.success) {
      console.warn('[SupabaseService] Failed to fetch updated votes:', votesResult.error)
    }

    return {
      success: true,
      vote: data,
      votes: votesResult.votes
    }
  } catch (error) {
    console.error('[SupabaseService] Submit vote error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Fetch all votes from Supabase
 * @returns {Promise<Object>} Result object with votes GeoJSON
 */
export async function fetchAllVotes() {
  console.log('[SupabaseService] Fetching all votes...')

  try {
    const client = getClient()

    // Fetch all votes ordered by creation date
    const { data, error } = await client
      .from('votes')
      .select('id, user_name, score, geom, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[SupabaseService] Fetch error:', error)
      return { success: false, error: error.message, votes: null }
    }

    console.log('[SupabaseService] Fetched', data?.length || 0, 'votes')

    // Convert to GeoJSON
    const geojson = votesToGeoJSON(data)
    return { success: true, votes: geojson }
  } catch (error) {
    console.error('[SupabaseService] Fetch votes error:', error)
    return { success: false, error: error.message, votes: null }
  }
}

/**
 * Convert votes data to GeoJSON format
 * @param {Array} votes - Array of vote objects from Supabase
 * @returns {Object} GeoJSON FeatureCollection
 */
export function votesToGeoJSON(votes) {
  if (!votes || !Array.isArray(votes)) {
    return {
      type: 'FeatureCollection',
      features: []
    }
  }

  const features = votes.map(vote => {
    // Parse geometry to [lng, lat]
    let coordinates = null

    // DEBUG: Log geom format to diagnose the issue
    console.log('[SupabaseService] vote.geom:', vote.geom, 'type:', typeof vote.geom)

    if (vote.geom) {
      if (typeof vote.geom === 'string') {
        // WKT format: "SRID=4326;POINT(51.389 35.6892)"
        const match = vote.geom.match(/POINT\(([^)]+)\)/)
        if (match) {
          const coords = match[1].split(' ').map(Number)
          if (coords.length === 2) {
            coordinates = [coords[0], coords[1]]
          }
        }
      } else if (typeof vote.geom === 'object') {
        // PostGIS JSON format: {"type":"Point","coordinates":[51.389,35.6892],...}
        if (vote.geom.coordinates && Array.isArray(vote.geom.coordinates)) {
          coordinates = vote.geom.coordinates
        }
      }
    }

    return {
      type: 'Feature',
      properties: {
        id: vote.id,
        user_name: vote.user_name,
        score: vote.score,
        created_at: vote.created_at
      },
      geometry: {
        type: 'Point',
        coordinates: coordinates || [0, 0]
      }
    }
  })

  return {
    type: 'FeatureCollection',
    features: features
  }
}

/**
 * Get vote count
 * @returns {Promise<number>} Number of votes
 */
export async function getVoteCount() {
  try {
    const client = getClient()

    const { count, error } = await client
      .from('votes')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('[SupabaseService] Count error:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('[SupabaseService] Get count error:', error)
    return 0
  }
}

/**
 * Test Supabase connection
 * @returns {Promise<boolean>} True if connection works
 */
export async function testConnection() {
  try {
    const client = getClient()

    // Try to fetch votes table info
    const { error } = await client
      .from('votes')
      .select('id')
      .limit(1)

    if (error) {
      console.error('[SupabaseService] Connection test failed:', error)
      return false
    }

    console.log('[SupabaseService] Connection test passed')
    return true
  } catch (error) {
    console.error('[SupabaseService] Connection test error:', error)
    return false
  }
}
