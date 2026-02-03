/**
 * UI Controls Module
 * Manages user interaction controls and state machine
 */

// Selection mode state
let selectionMode = false;

// Click handler callback
let clickHandler = null;

// DOM elements
let selectButton = null;
let statusElement = null;

/**
 * Initialize UI controls
 */
export function initControls() {
    console.log('[Controls] Initializing controls...');

    // Get DOM elements
    selectButton = document.getElementById('select-place-btn');
    statusElement = document.getElementById('status-message');

    if (!selectButton) {
        console.error('[Controls] Select button not found');
        return false;
    }

    // Set up button click handler
    selectButton.addEventListener('click', handleSelectButtonClick);

    // Set up warning listener for boundary validation
    window.addEventListener('boundaryWarning', handleBoundaryWarning);

    console.log('[Controls] Controls initialized');
    return true;
}

/**
 * Handle select button click
 */
function handleSelectButtonClick() {
    if (selectionMode) {
        // Exit selection mode
        exitSelectionMode();
    } else {
        // Enter selection mode
        enterSelectionMode();
    }
}

/**
 * Enter selection mode
 */
export function enterSelectionMode() {
    selectionMode = true;
    updateUI();

    // Change cursor to crosshair
    document.getElementById('map').style.cursor = 'crosshair';

    setStatus('Click on the map to select your favorite place');

    console.log('[Controls] Entered selection mode');
}

/**
 * Exit selection mode
 */
export function exitSelectionMode() {
    selectionMode = false;
    updateUI();

    // Reset cursor
    document.getElementById('map').style.cursor = '';

    clearStatus();

    console.log('[Controls] Exited selection mode');
}

/**
 * Handle boundary warning event
 */
function handleBoundaryWarning(event) {
    const { lng, lat } = event.detail;
    setStatus('Location outside Tehran boundary. Please click inside the marked area.', 'warning');

    // Auto-clear warning after 5 seconds
    setTimeout(() => {
        if (!selectionMode) {
            clearStatus();
        }
    }, 5000);
}

/**
 * Update UI based on current state
 */
function updateUI() {
    if (!selectButton) return;

    if (selectionMode) {
        selectButton.textContent = 'Cancel Selection';
        selectButton.classList.add('active');
    } else {
        selectButton.textContent = 'Select your favorite place';
        selectButton.classList.remove('active');
    }
}

/**
 * Set status message
 * @param {string} message - Message to display
 * @param {string} type - Message type ('info', 'success', 'warning', 'error')
 */
export function setStatus(message, type = 'info') {
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = 'status-message';
    statusElement.classList.add(type);
    statusElement.style.display = 'block';

    // Emit status change event
    window.dispatchEvent(new CustomEvent('statusChange', {
        detail: { message, type }
    }));
}

/**
 * Clear status message
 */
export function clearStatus() {
    if (!statusElement) return;

    statusElement.textContent = '';
    statusElement.className = 'status-message';
    statusElement.style.display = 'none';
}

/**
 * Show success message
 * @param {string} message - Success message
 */
export function showSuccess(message) {
    setStatus(message, 'success');

    // Auto-clear after 5 seconds
    setTimeout(() => {
        clearStatus();
    }, 5000);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
export function showError(message) {
    setStatus(message, 'error');

    // Auto-clear after 8 seconds
    setTimeout(() => {
        clearStatus();
    }, 8000);
}

/**
 * Check if selection mode is active
 * @returns {boolean} True if in selection mode
 */
export function isSelectionMode() {
    return selectionMode;
}

/**
 * Set click handler
 * @param {Function} handler - Click handler function
 */
export function setMapClickHandler(handler) {
    clickHandler = handler;
}

/**
 * Get click handler
 * @returns {Function|null} Click handler or null
 */
export function getClickHandler() {
    return clickHandler;
}

/**
 * Toggle selection mode
 */
export function toggleSelectionMode() {
    if (selectionMode) {
        exitSelectionMode();
    } else {
        enterSelectionMode();
    }
}

/**
 * Reset all controls
 */
export function resetControls() {
    if (selectionMode) {
        exitSelectionMode();
    }
    clearStatus();
    console.log('[Controls] Controls reset');
}
