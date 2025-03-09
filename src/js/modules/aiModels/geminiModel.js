/**
 * Implementation of the Gemini AI model using Chrome's built-in Prompt API
 */
export class GeminiModel {
  /**
   * Get category for a tab using Gemini
   * @param {string} prompt - Prompt for the AI model
   * @param {Object} tab - Tab object
   * @returns {Promise<string>} - Category name
   */
  async getCategory(prompt, tab) {
    try {
      // Send request to background script to make the API call
      const result = await chrome.runtime.sendMessage({
        action: 'analyzeWithGemini',
        prompt: prompt,
        tabId: tab.id
      });
      
      if (result.error) {
        console.warn(`Gemini error for tab "${tab.title}": ${result.error}`);
        // Don't throw error, return the category from fallback mechanism
        return result.category || 'Uncategorized';
      }
      
      return result.category || 'Misc';
    } catch (error) {
      console.error('Error using Gemini model:', error);
      // Don't throw error, return a default category
      return 'Uncategorized';
    }
  }
}