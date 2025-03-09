/**
 * Implementation of Ollama AI model
 */
export class OllamaModel {
  /**
   * Create a new Ollama model instance
   * @param {string} url - URL for Ollama API
   * @param {string} model - Model name for Ollama
   */
  constructor(url, model) {
    this.url = url;
    this.model = model;
  }

  /**
   * Get category for a tab using Ollama API
   * @param {string} prompt - Prompt for the AI model
   * @param {Object} tab - Tab object
   * @returns {Promise<string>} - Category name
   */
  async getCategory(prompt, tab) {
    try {
      // Send request to background script to make the API call
      // (Content scripts can't make cross-origin requests directly)
      const result = await chrome.runtime.sendMessage({
        action: 'analyzeWithOllama',
        url: this.url,
        model: this.model,
        prompt: prompt,
        tabId: tab.id
      });
      
      if (result.error) {
        console.warn(`Ollama error for tab "${tab.title}": ${result.error}`);
        // Don't throw error, return the category from fallback mechanism
        return result.category || 'Uncategorized';
      }
      
      return result.category || 'Misc';
    } catch (error) {
      console.error('Error using Ollama model:', error);
      // Don't throw error, return a default category
      return 'Uncategorized';
    }
  }
}