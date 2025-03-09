/**
 * Implementation of Chrome's Gemini AI model
 */
export class GeminiModel {
  /**
   * Get category for a tab using Chrome's Gemini API
   * @param {string} prompt - Prompt for the AI model
   * @param {Object} tab - Tab object
   * @returns {Promise<string>} - Category name
   */
  async getCategory(prompt, tab) {
    try {
      // Use Chrome's Gemini API
      const result = await chrome.runtime.sendMessage({
        action: 'analyzeWithGemini',
        prompt: prompt,
        tabId: tab.id
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return result.category || 'misc';
    } catch (error) {
      console.error('Error using Gemini model:', error);
      throw new Error('Failed to analyze with Gemini');
    }
  }
}