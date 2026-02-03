/**
 * Vote Service Module
 * Handles all Supabase interactions for votes
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from '../config/supabase.js';

// Supabase client
let supabase = null;

/**
 * Initialize Supabase client
 * @returns {Object} Supabase client instance
 */
function getClient() {
    if (supabase) {
        return supabase;
    }

    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseAnonKey();

    if (!supabaseUrl || !supabaseKey) {
        console.error('[VoteService] Supabase credentials not configured');
        throw new Error('Supabase credentials not configured');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[VoteService] Supabase client initialized');
    return supabase;
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
    console.log('[VoteService] Submitting vote:', { userName, score, lng, lat });

    try {
        const client = getClient();

        // Create WKT geometry point
        const geom = `SRID=4326;POINT(${lng} ${lat})`;

        // Insert vote
        const { data, error } = await client
            .from('votes')
            .insert({
                user_name: userName,
                score: score,
                geom: geom
            })
            .select()
            .single();

        if (error) {
            console.error('[VoteService] Insert error:', error);
            return { success: false, error: error.message };
        }

        console.log('[VoteService] Vote inserted:', data);

        // Fetch all votes for hotspot update
        const votesResult = await fetchAllVotes();
        if (!votesResult.success) {
            console.warn('[VoteService] Failed to fetch updated votes:', votesResult.error);
        }

        return {
            success: true,
            vote: data,
            votes: votesResult.votes
        };
    } catch (error) {
        console.error('[VoteService] Submit vote error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch all votes from Supabase
 * @returns {Promise<Object>} Result object with votes GeoJSON
 */
export async function fetchAllVotes() {
    console.log('[VoteService] Fetching all votes...');

    try {
        const client = getClient();

        // Fetch all votes ordered by creation date
        const { data, error } = await client
            .from('votes')
            .select('id, user_name, score, geom, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[VoteService] Fetch error:', error);
            return { success: false, error: error.message, votes: null };
        }

        console.log('[VoteService] Fetched', data?.length || 0, 'votes');

        // Convert to GeoJSON
        const geojson = votesToGeoJSON(data);
        return { success: true, votes: geojson };
    } catch (error) {
        console.error('[VoteService] Fetch votes error:', error);
        return { success: false, error: error.message, votes: null };
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
        };
    }

    const features = votes.map(vote => {
        // Parse WKT geometry to [lng, lat]
        let coordinates = null;

        if (vote.geom) {
            // Extract coordinates from WKT (e.g., "SRID=4326;POINT(51.389 35.6892)")
            const match = vote.geom.match(/POINT\(([^)]+)\)/);
            if (match) {
                const coords = match[1].split(' ').map(Number);
                if (coords.length === 2) {
                    coordinates = [coords[0], coords[1]];
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
        };
    });

    return {
        type: 'FeatureCollection',
        features: features
    };
}

/**
 * Get vote count
 * @returns {Promise<number>} Number of votes
 */
export async function getVoteCount() {
    try {
        const client = getClient();

        const { count, error } = await client
            .from('votes')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('[VoteService] Count error:', error);
            return 0;
        }

        return count || 0;
    } catch (error) {
        console.error('[VoteService] Get count error:', error);
        return 0;
    }
}

/**
 * Check if Supabase is configured
 * @returns {boolean} True if configured
 */
export function isConfigured() {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    return !!(url && key && url.length > 0 && key.length > 0);
}

/**
 * Test Supabase connection
 * @returns {Promise<boolean>} True if connection works
 */
export async function testConnection() {
    try {
        const client = getClient();

        // Try to fetch votes table info
        const { error } = await client
            .from('votes')
            .select('id')
            .limit(1);

        if (error) {
            console.error('[VoteService] Connection test failed:', error);
            return false;
        }

        console.log('[VoteService] Connection test passed');
        return true;
    } catch (error) {
        console.error('[VoteService] Connection test error:', error);
        return false;
    }
}
