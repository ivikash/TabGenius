/**
 * Manages the UI interactions and state for the extension popup
 */
export class UIManager {
  /**
   * Initialize UI components and state
   */
  init() {
    // Set initial state for Ollama options visibility
    this.toggleOllamaOptions(document.getElementById('model-select').value === 'ollama');
    
    // Clear any previous status messages
    this.clearStatus();
  }

  /**
   * Toggle visibility of Ollama configuration options
   * @param {boolean} show - Whether to show or hide Ollama options
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
   * Display a status message to the user
   * @param {string} message - The message to display
   * @param {string} type - The type of message (success, error, loading)
   */
  showStatus(message, type = '') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = 'status';
    
    if (type) {
      statusElement.classList.add(type);
    }
  }

  /**
   * Clear the status message
   */
  clearStatus() {
    const statusElement = document.getElementById('status');
    statusElement.textContent = '';
    statusElement.className = 'status';
  }

  /**
   * Set the enabled state of a button
   * @param {string} buttonId - ID of the button element
   * @param {boolean} enabled - Whether the button should be enabled
   */
  setButtonEnabled(buttonId, enabled) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = !enabled;
    }
  }

  /**
   * Set the enabled state of multiple buttons
   * @param {Object} buttonStates - Object mapping button IDs to enabled states
   */
  setButtonsState(buttonStates) {
    for (const [buttonId, enabled] of Object.entries(buttonStates)) {
      this.setButtonEnabled(buttonId, enabled);
    }
  }
}