/**
 * Popup Module
 * Handles vote submission popup form
 */

import { submitVote } from '../votes/vote.service.js';
import { exitSelectionMode, showError, showSuccess } from './controls.js';
import { getMap } from '../map/map.js';

// Popup instance
let currentPopup = null;

// Selected location
let selectedLocation = null;

/**
 * Show vote submission popup at a location
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 */
export function showVotePopup(lng, lat) {
    selectedLocation = { lng, lat };

    // Create popup content
    const popupContent = createPopupContent(lng, lat);

    // Create and open popup
    const map = getMap();
    if (!map) {
        console.error('[Popup] Map not available');
        return;
    }

    currentPopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '320px',
        anchor: 'bottom'
    })
        .setLngLat([lng, lat])
        .setHTML(popupContent)
        .addTo(map);

    // Handle popup close
    currentPopup.on('close', () => {
        selectedLocation = null;
        exitSelectionMode();
    });

    // Set up form submission
    setupFormSubmission();

    console.log('[Popup] Vote popup shown at', lng, lat);
}

/**
 * Create popup HTML content
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @returns {string} HTML content
 */
function createPopupContent(lng, lat) {
    return `
        <div class="vote-popup">
            <h3>Rate Your Favorite Place</h3>
            <p class="coordinates">Location: ${lng.toFixed(5)}, ${lat.toFixed(5)}</p>

            <form id="vote-form">
                <div class="form-group">
                    <label for="user-name">Your Name *</label>
                    <input
                        type="text"
                        id="user-name"
                        name="user_name"
                        placeholder="Enter your name"
                        required
                        maxlength="100"
                    >
                </div>

                <div class="form-group">
                    <label>Favorability Score (0-5) *</label>
                    <div class="score-slider-container">
                        <input
                            type="range"
                            id="score-slider"
                            name="score"
                            min="0"
                            max="5"
                            value="3"
                            step="1"
                        >
                        <div class="score-labels">
                            <span>0</span>
                            <span>1</span>
                            <span>2</span>
                            <span>3</span>
                            <span>4</span>
                            <span>5</span>
                        </div>
                        <div class="score-value" id="score-value">3</div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-cancel" id="btn-cancel">Cancel</button>
                    <button type="submit" class="btn-submit" id="btn-submit">Submit Vote</button>
                </div>
            </form>

            <div class="error-message" id="popup-error" style="display: none;"></div>
        </div>
    `;
}

/**
 * Set up form submission handler
 */
function setupFormSubmission() {
    const form = document.getElementById('vote-form');
    const cancelBtn = document.getElementById('btn-cancel');
    const slider = document.getElementById('score-slider');
    const scoreValue = document.getElementById('score-value');

    if (!form || !cancelBtn || !slider || !scoreValue) {
        console.error('[Popup] Form elements not found');
        return;
    }

    // Score slider update
    slider.addEventListener('input', (e) => {
        scoreValue.textContent = e.target.value;
        updateScoreVisualization(e.target.value);
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
        closePopup();
        exitSelectionMode();
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('user-name').value.trim();
        const score = parseInt(slider.value, 10);

        // Validate
        if (!name) {
            showPopupError('Please enter your name');
            return;
        }

        if (name.length < 2) {
            showPopupError('Name must be at least 2 characters');
            return;
        }

        if (isNaN(score) || score < 0 || score > 5) {
            showPopupError('Score must be between 0 and 5');
            return;
        }

        // Submit vote
        await handleVoteSubmission(name, score);
    });

    // Initialize score visualization
    updateScoreVisualization(slider.value);
}

/**
 * Update score visualization (colors)
 * @param {number} score - Score value 0-5
 */
function updateScoreVisualization(score) {
    const scoreValue = document.getElementById('score-value');
    if (!scoreValue) return;

    // Red to green gradient matching vote layer
    const colors = ['#ff0000', '#cc6600', '#999900', '#66cc00', '#33ff00', '#00ff00'];
    scoreValue.style.backgroundColor = colors[score] || colors[3];
    scoreValue.textContent = score;
}

/**
 * Handle vote submission
 * @param {string} name - User name
 * @param {number} score - Favorability score
 */
async function handleVoteSubmission(name, score) {
    const submitBtn = document.getElementById('btn-submit');
    const errorDiv = document.getElementById('popup-error');

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    errorDiv.style.display = 'none';

    try {
        // Submit to Supabase
        const result = await submitVote(name, score, selectedLocation.lng, selectedLocation.lat);

        if (result.success) {
            showSuccess('Vote submitted successfully!');

            // Close popup
            closePopup();

            // Exit selection mode
            exitSelectionMode();

            // Emit vote submitted event for hotspot update
            window.dispatchEvent(new CustomEvent('voteSubmitted', {
                detail: { votes: result.votes }
            }));

            console.log('[Popup] Vote submitted successfully');
        } else {
            throw new Error(result.error || 'Failed to submit vote');
        }
    } catch (error) {
        console.error('[Popup] Vote submission error:', error);
        showPopupError(error.message || 'Failed to submit vote. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Vote';
    }
}

/**
 * Show error in popup
 * @param {string} message - Error message
 */
function showPopupError(message) {
    const errorDiv = document.getElementById('popup-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

/**
 * Close current popup
 */
export function closePopup() {
    if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
    }
    selectedLocation = null;
}

/**
 * Check if popup is open
 * @returns {boolean} True if popup is open
 */
export function isPopupOpen() {
    return currentPopup !== null;
}

/**
 * Get selected location
 * @returns {Object|null} Selected location {lng, lat} or null
 */
export function getSelectedLocation() {
    return selectedLocation;
}
