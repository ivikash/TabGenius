/**
 * Debug Logger for Tab Genius extension
 * Provides consistent logging functionality with debug mode toggle
 */
class DebugLogger {
  constructor() {
    this.isDebugMode = false;
    this.prefix = '🔍 [Tab Genius]';
    this.loadDebugSettings();
    
    // Log initialization
    console.log(`${this.prefix} Logger initialized at ${new Date().toISOString()}`);
  }

  /**
   * Load debug settings from storage
   */
  async loadDebugSettings() {
    try {
      const result = await chrome.storage.sync.get('tabGeniusDebugMode');
      this.isDebugMode = result.tabGeniusDebugMode === true;
      
      // Always log the debug mode status on initialization
      if (this.isDebugMode) {
        console.log(`${this.prefix} Debug mode is ENABLED`);
      } else {
        console.log(`${this.prefix} Debug mode is disabled (enable in extension settings for verbose logging)`);
      }
    } catch (error) {
      console.error(`${this.prefix} Error loading debug settings:`, error);
    }
  }

  /**
   * Set debug mode
   * @param {boolean} enabled - Whether debug mode should be enabled
   */
  async setDebugMode(enabled) {
    try {
      this.isDebugMode = enabled === true;
      await chrome.storage.sync.set({ tabGeniusDebugMode: this.isDebugMode });
      this.log('Debug mode set to:', this.isDebugMode);
    } catch (error) {
      console.error(`${this.prefix} Error saving debug settings:`, error);
    }
  }

  /**
   * Log a message if debug mode is enabled
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  log(message, data) {
    if (this.isDebugMode) {
      if (data !== undefined) {
        console.log(`${this.prefix} ${message}`, data);
      } else {
        console.log(`${this.prefix} ${message}`);
      }
    }
  }

  /**
   * Log a warning message (always shown)
   * @param {string} message - The warning message
   * @param {any} data - Optional data to log
   */
  warn(message, data) {
    if (data !== undefined) {
      console.warn(`${this.prefix} ⚠️ ${message}`, data);
    } else {
      console.warn(`${this.prefix} ⚠️ ${message}`);
    }
  }

  /**
   * Log an error message (always shown)
   * @param {string} message - The error message
   * @param {any} error - The error object
   */
  error(message, error) {
    console.error(`${this.prefix} 🛑 ${message}`, error);
  }

  /**
   * Log performance timing
   * @param {string} label - Label for the timing
   * @param {function} fn - Function to time
   * @returns {Promise<any>} - Result of the function
   */
  async time(label, fn) {
    if (!this.isDebugMode) {
      return await fn();
    }
    
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      console.log(`${this.prefix} ⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`${this.prefix} ⏱️ ${label} failed after ${(end - start).toFixed(2)}ms:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const debugLogger = new DebugLogger();
export default debugLogger;