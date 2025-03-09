/**
 * UI Manager for Tab Genius extension
 * Handles UI interactions and status updates
 */
export class UIManager {
  constructor() {
    this.statusElement = null;
    this.categoryManagerSection = null;
  }

  /**
   * Initialize UI components
   */
  init() {
    this.statusElement = document.getElementById('status');
    this.categoryManagerSection = document.getElementById('categoryManagerSection');
    
    // Initialize toggle for category manager
    document.getElementById('toggleCategoryManager').addEventListener('click', () => {
      this.toggleCategoryManager();
    });
    
    // Initialize Ollama options visibility
    this.toggleOllamaOptions(document.getElementById('model-select').value === 'ollama');
  }

  /**
   * Show status message with optional type (loading, success, error)
   * @param {string} message - Status message to display
   * @param {string} type - Type of status (loading, success, error)
   */
  showStatus(message, type = '') {
    if (!this.statusElement) return;
    
    // Clear previous classes
    this.statusElement.className = 'status';
    
    // Add type class if provided
    if (type) {
      this.statusElement.classList.add(type);
    }
    
    // Set message
    this.statusElement.textContent = message;
    
    // Show notification for errors and success
    if (type === 'error' || type === 'success') {
      this.showNotification(type === 'error' ? 'Error' : 'Success', message);
    }
    
    // Auto-clear success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        if (this.statusElement.textContent === message) {
          this.statusElement.textContent = '';
        }
      }, 3000);
    }
  }

  /**
   * Show a notification with the extension's icon
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  showNotification(title, message) {
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
   */
  toggleCategoryManager() {
    if (!this.categoryManagerSection) return;
    
    if (this.categoryManagerSection.classList.contains('hidden')) {
      this.categoryManagerSection.classList.remove('hidden');
    } else {
      this.categoryManagerSection.classList.add('hidden');
    }
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