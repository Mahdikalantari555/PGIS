/**
 * Supabase Configuration Module
 * Manages Supabase credentials from environment variables
 */

// Environment variable keys
const SUPABASE_URL_KEY = 'VITE_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'VITE_SUPABASE_ANON_KEY';

/**
 * Get Supabase URL from environment variables
 * @returns {string} Supabase project URL
 */
export function getSupabaseUrl() {
    return import.meta.env?.[SUPABASE_URL_KEY] || '';
}

/**
 * Get Supabase anonymous key from environment variables
 * @returns {string} Supabase anonymous key
 */
export function getSupabaseAnonKey() {
    return import.meta.env?.[SUPABASE_ANON_KEY] || '';
}

/**
 * Check if Supabase is configured
 * @returns {boolean} True if both URL and key are present
 */
export function isSupabaseConfigured() {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    return !!(url && key && url.length > 0 && key.length > 0);
}

/**
 * Get Supabase configuration status
 * @returns {Object} Configuration status
 */
export function getSupabaseConfigStatus() {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();

    return {
        configured: !!(url && key),
        hasUrl: !!url,
        hasKey: !!key,
        urlPrefix: url ? url.split('.')[0] : ''
    };
}

/**
 * Validate Supabase URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid format
 */
export function isValidSupabaseUrl(url) {
    if (!url) return false;
    // Check for standard Supabase URL pattern
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url);
}
