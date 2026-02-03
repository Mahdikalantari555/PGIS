/**
 * Main Application Entry Point
 * Initializes all modules and handles application lifecycle
 */

import { initMap, updateHotspots, getCurrentState, setCurrentState, MAP_STATE } from './map/map.js';
import { initControls, enterSelectionMode, exitSelectionMode, showError, showSuccess, showConfigWarning } from './ui/controls.js';
import { closePopup } from './ui/popup.js';
import { fetchAllVotes, isConfigured, testConnection } from './votes/vote.service.js';
import { isSupabaseConfigured, getSupabaseConfigStatus } from './config/supabase.js';
import './styles/app.css';

// Application state
const APP_STATE = {
    INITIALIZING: 'INITIALIZING',
    READY: 'READY',
    ERROR: 'ERROR'
};

let appState = APP_STATE.INITIALIZING;

/**
 * Initialize the application
 */
async function initApp() {
    console.log('[Main] Initializing application...');

    try {
        // Check Supabase configuration
        if (!isSupabaseConfigured()) {
            console.warn('[Main] Supabase not configured');
            showConfigWarning();
        } else {
            // Test Supabase connection
            const connected = await testConnection();
            if (!connected) {
                console.warn('[Main] Supabase connection test failed');
                showError('Failed to connect to database. Please check configuration.');
            }
        }

        // Initialize map
        await initMap();
        console.log('[Main] Map initialized');

        // Initialize controls
        const controlsInitialized = initControls();
        if (!controlsInitialized) {
            throw new Error('Failed to initialize controls');
        }
        console.log('[Main] Controls initialized');

        // Load initial votes for hotspot
        await loadInitialVotes();

        // Set up event listeners
        setupEventListeners();

        // Set state to ready
        appState = APP_STATE.READY;
        setCurrentState(MAP_STATE.IDLE);

        console.log('[Main] Application ready');
    } catch (error) {
        console.error('[Main] Initialization error:', error);
        appState = APP_STATE.ERROR;
        showError('Failed to initialize application. Please refresh the page.');
    }
}

/**
 * Load initial votes and update hotspot
 */
async function loadInitialVotes() {
    try {
        const result = await fetchAllVotes();
        if (result.success && result.votes) {
            await updateHotspots(result.votes);
            console.log('[Main] Initial votes loaded:', result.votes.features?.length || 0);
        } else {
            console.warn('[Main] Failed to load initial votes:', result.error);
        }
    } catch (error) {
        console.error('[Main] Load votes error:', error);
    }
}

/**
 * Set up global event listeners
 */
function setupEventListeners() {
    // Vote submitted event - update hotspot
    window.addEventListener('voteSubmitted', async (event) => {
        console.log('[Main] Vote submitted event received');

        if (event.detail?.votes) {
            await updateHotspots(event.detail.votes);
        } else {
            // Fallback: fetch all votes
            await loadInitialVotes();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape to cancel selection or close popup
        if (e.key === 'Escape') {
            closePopup();
            exitSelectionMode();
        }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && appState === APP_STATE.READY) {
            // Refresh votes when tab becomes visible
            loadInitialVotes();
        }
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
        console.log('[Main] Back online - refreshing data');
        loadInitialVotes();
    });

    window.addEventListener('offline', () => {
        console.warn('[Main] Gone offline');
        showError('You are offline. Some features may not work.');
    });
}

/**
 * Show configuration warning
 */
function showConfigWarning() {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.textContent = 'Warning: Supabase not configured. Please set environment variables.';
        statusEl.className = 'status-message warning';
        statusEl.style.display = 'block';
    }
}

/**
 * Get application state
 * @returns {string} Current app state
 */
export function getAppState() {
    return appState;
}

/**
 * Check if application is ready
 * @returns {boolean} True if ready
 */
export function isAppReady() {
    return appState === APP_STATE.READY;
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}

// Export for debugging
window.FavorabilityApp = {
    initApp,
    getAppState,
    isAppReady,
    loadInitialVotes
};
