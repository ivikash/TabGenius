/**
 * Analytics module for Tab Genius extension
 * Handles analytics tracking with a custom implementation
 * that works within Chrome extension Content Security Policy restrictions
 */
class Analytics {
  constructor() {
    this.isInitialized = false;
    this.projectId = 'phc_7pYkC2JhWEttaIlFNrXIu2nj5dtjZxWHisESUU9FSjQ';
    this.apiHost = 'https://us.i.posthog.com';
    this.queue = [];
    this.distinctId = null;
    this.init();
  }

  /**
   * Initialize analytics
   */
  async init() {
    try {
      // Generate or retrieve a distinct ID for this user
      await this.getOrCreateDistinctId();
      
      // Process any queued events
      this.processQueue();
      
      this.isInitialized = true;
      console.log('Analytics tracking initialized');
    } catch (error) {
      console.error('Error initializing analytics:', error);
    }
  }

  /**
   * Get or create a distinct ID for this user
   */
  async getOrCreateDistinctId() {
    try {
      const result = await chrome.storage.local.get('analyticsDistinctId');
      if (result.analyticsDistinctId) {
        this.distinctId = result.analyticsDistinctId;
      } else {
        // Generate a UUID
        this.distinctId = this.generateUUID();
        await chrome.storage.local.set({ analyticsDistinctId: this.distinctId });
      }
    } catch (error) {
      // Fallback to a random ID if storage fails
      this.distinctId = this.generateUUID();
      console.error('Error getting distinct ID:', error);
    }
  }

  /**
   * Generate a UUID v4
   * @returns {string} UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Process queued events
   */
  processQueue() {
    while (this.queue.length > 0) {
      const { eventName, properties } = this.queue.shift();
      this.sendEvent(eventName, properties);
    }
  }

  /**
   * Send event to analytics backend using fetch
   * @param {string} eventName - Name of the event
   * @param {Object} properties - Event properties
   */
  async sendEvent(eventName, properties = {}) {
    if (!this.distinctId) return;
    
    try {
      const payload = {
        api_key: this.projectId,
        event: eventName,
        distinct_id: this.distinctId,
        properties: {
          ...properties,
          $lib: 'tab-genius-extension',
          extension_version: chrome.runtime.getManifest().version,
          timestamp: new Date().toISOString()
        }
      };
      
      // Use fetch to send the event
      // Note: This is done in a fire-and-forget manner
      fetch(`${this.apiHost}/capture/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).catch(error => {
        // Silently handle errors to avoid disrupting the user experience
        console.debug('Analytics event send error:', error);
      });
    } catch (error) {
      console.debug('Error sending analytics event:', error);
    }
  }

  /**
   * Track an event
   * @param {string} eventName - Name of the event
   * @param {Object} properties - Event properties
   */
  trackEvent(eventName, properties = {}) {
    if (!this.isInitialized) {
      // Queue the event for later
      this.queue.push({ eventName, properties });
      return;
    }

    this.sendEvent(eventName, properties);
  }

  /**
   * Track extension installation or update
   * @param {string} reason - Install reason
   */
  trackInstall(reason) {
    this.trackEvent('extension_installed', { reason });
  }

  /**
   * Track tab sorting action
   * @param {string} method - Sorting method used
   * @param {number} tabCount - Number of tabs sorted
   * @param {number} duration - Time taken in milliseconds
   */
  trackSort(method, tabCount, duration) {
    this.trackEvent('tabs_sorted', {
      sort_method: method,
      tab_count: tabCount,
      duration_ms: duration
    });
  }

  /**
   * Track tab organization with AI
   * @param {string} model - AI model used
   * @param {number} tabCount - Number of tabs organized
   * @param {number} duration - Time taken in milliseconds
   * @param {number} groupCount - Number of groups created
   */
  trackOrganize(model, tabCount, duration, groupCount) {
    this.trackEvent('tabs_organized', {
      ai_model: model,
      tab_count: tabCount,
      duration_ms: duration,
      group_count: groupCount
    });
  }

  /**
   * Track settings changes
   * @param {string} setting - Setting that was changed
   * @param {any} value - New value of the setting
   */
  trackSettingChange(setting, value) {
    this.trackEvent('setting_changed', {
      setting_name: setting,
      new_value: value
    });
  }

  /**
   * Track error events
   * @param {string} action - Action that caused the error
   * @param {string} error - Error message
   */
  trackError(action, error) {
    this.trackEvent('error_occurred', {
      action,
      error_message: error
    });
  }
}

// Create a singleton instance
const analytics = new Analytics();
export default analytics;
