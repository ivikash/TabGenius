/**
 * UI Manager for Tab Genius extension
 * Handles UI interactions and status updates
 */
export class UIManager {
  constructor() {
    this.categoryManagerSection = null;
    this.notificationsEnabled = true;
  }

  /**
   * Initialize UI components
   */
  init() {
    // Initialize Ollama options visibility
    this.toggleOllamaOptions(document.getElementById('model-select').value === 'ollama');
    
    // Initialize notifications checkbox
    this.initNotificationsCheckbox();
    
    // Initialize collapsible sections
    this.initCollapsibleSections();
  }

  /**
   * Initialize collapsible sections
   */
  initCollapsibleSections() {
    const collapsibles = document.querySelectorAll('.collapsible');
    
    collapsibles.forEach(header => {
      const content = document.getElementById(header.id.replace('Header', 'Content'));
      if (!content) return;
      
      header.addEventListener('click', () => {
        // Toggle collapsed state
        content.classList.toggle('collapsed');
        
        // Toggle active class on header
        header.classList.toggle('active');
        
        // Update aria attributes
        const isExpanded = !content.classList.contains('collapsed');
        header.setAttribute('aria-expanded', isExpanded);
        
        // Update icon
        const icon = header.querySelector('.toggle-icon');
        if (icon) {
          icon.textContent = isExpanded ? 'expand_less' : 'expand_more';
        }
      });
      
      // Set initial state
      const isExpanded = !content.classList.contains('collapsed');
      header.setAttribute('aria-expanded', isExpanded);
    });
  }

  /**
   * Initialize notifications checkbox
   */
  async initNotificationsCheckbox() {
    const notificationsCheckbox = document.getElementById('enableNotifications');
    if (!notificationsCheckbox) return;
    
    // Load saved preference
    try {
      const result = await new Promise(resolve => {
        chrome.storage.sync.get('notificationsEnabled', resolve);
      });
      
      // Default to true if not set
      this.notificationsEnabled = result.notificationsEnabled !== false;
      notificationsCheckbox.checked = this.notificationsEnabled;
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      // Default to true
      this.notificationsEnabled = true;
      notificationsCheckbox.checked = true;
    }
    
    // Add event listener
    notificationsCheckbox.addEventListener('change', (e) => {
      this.notificationsEnabled = e.target.checked;
      this.saveNotificationPreference();
    });
  }

  /**
   * Save notification preference
   */
  saveNotificationPreference() {
    try {
      chrome.storage.sync.set({ 'notificationsEnabled': this.notificationsEnabled });
    } catch (error) {
      console.error('Error saving notification preference:', error);
    }
  }

  /**
   * Show a notification with the extension's icon
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  showNotification(title, message) {
    if (!this.notificationsEnabled) return;
    
    chrome.runtime.sendMessage({
      action: 'showNotification',
      title: title,
      message: message
    });
  }
  
  /**
   * Show status message with optional type (loading, success, error)
   * @param {string} message - Status message to display
   * @param {string} type - Type of status (loading, success, error)
   */
  showStatus(message, type = '') {
    // Update status message in UI
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
      // Remove all existing status classes
      statusElement.classList.remove('placeholder', 'success', 'error', 'loading');
      
      // Add the appropriate class based on type
      if (type) {
        statusElement.classList.add(type);
      } else {
        statusElement.classList.add('placeholder');
      }
      
      // Update the message text
      statusElement.textContent = message;
    }
    
    // Just show a notification for errors and success
    if ((type === 'error' || type === 'success') && this.notificationsEnabled) {
      this.showNotification(type === 'error' ? 'Error' : 'Success', message);
    }
    
    // Log the status message
    if (type === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  }
  showNotification(title, message) {
    if (!this.notificationsEnabled) return;
    
    chrome.runtime.sendMessage({
      action: 'showNotification',
      title: title,
      message: message
    });
  }

  /**
   * Toggle visibility of Ollama options
   * @param {boolean} show - Whether to show Ollama options
   */
  toggleOllamaOptions(show) {
    const ollamaOptions = document.getElementById('ollama-options');
    if (show) {
      ollamaOptions.classList.remove('hidden');
    } else {
      ollamaOptions.classList.add('hidden');
    }
  }

  /**
   * Toggle visibility of category manager section
   * @deprecated This method is no longer used as the category manager is now always visible
   */
  toggleCategoryManager() {
    // This method is kept for backward compatibility but is no longer used
    console.warn('toggleCategoryManager is deprecated');
  }

  /**
   * Set enabled state for a button
   * @param {string} buttonId - ID of the button
   * @param {boolean} enabled - Whether the button should be enabled
   */
  setButtonEnabled(buttonId, enabled) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = !enabled;
    }
  }

  /**
   * Set enabled state for multiple buttons
   * @param {Object} buttonStates - Object with button IDs as keys and boolean states as values
   */
  setButtonsState(buttonStates) {
    for (const [buttonId, enabled] of Object.entries(buttonStates)) {
      this.setButtonEnabled(buttonId, enabled);
    }
  }
}