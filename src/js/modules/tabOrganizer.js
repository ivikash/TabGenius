import { AIModelFactory } from './aiModels/aiModelFactory.js';

/**
 * Handles tab organization functionality
 */
export class TabOrganizer {
  /**
   * Organize tabs by content using AI models
   * @param {Object} modelConfig - Configuration for the AI model
   * @returns {Promise<void>}
   */
  async organizeByContent(modelConfig) {
    try {
      // Get all tabs
      const tabs = await this.getAllTabs();
      
      // Skip if no tabs to organize
      if (tabs.length === 0) {
        throw new Error('No valid tabs to organize');
      }
      
      // Create AI model instance
      const aiModel = AIModelFactory.createModel(modelConfig);
      
      // Process tabs in batches to avoid overwhelming the AI model
      const tabGroups = await this.processTabsWithAI(tabs, aiModel);
      
      // Create tab groups based on AI categorization
      await this.createTabGroups(tabGroups);
      
    } catch (error) {
      console.error('Error organizing tabs by content:', error);
      throw new Error('Failed to organize tabs by content');
    }
  }

  /**
   * Get all tabs from the current window, excluding chrome:// URLs
   * @returns {Promise<Array>} - Array of tab objects
   */
  async getAllTabs() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          // Filter out chrome:// and chrome-extension:// URLs
          const filteredTabs = tabs.filter(tab => {
            return !tab.url.startsWith('chrome://') && 
                   !tab.url.startsWith('chrome-extension://');
          });
          resolve(filteredTabs);
        }
      });
    });
  }

  /**
   * Process tabs with AI to categorize them
   * @param {Array} tabs - Array of tab objects
   * @param {Object} aiModel - AI model instance
   * @returns {Promise<Object>} - Object mapping category names to arrays of tab IDs
   */
  async processTabsWithAI(tabs, aiModel) {
    const tabGroups = {};
    
    // Process each tab
    for (const tab of tabs) {
      try {
        // Get tab content and analyze with AI
        const category = await this.getTabCategory(tab, aiModel);
        
        // Initialize category array if it doesn't exist
        if (!tabGroups[category]) {
          tabGroups[category] = [];
        }
        
        // Add tab to appropriate category
        tabGroups[category].push(tab.id);
      } catch (error) {
        console.warn(`Skipping tab "${tab.title}": ${error.message}`);
      }
    }
    
    return tabGroups;
  }

  /**
   * Get category for a tab using AI
   * @param {Object} tab - Tab object
   * @param {Object} aiModel - AI model instance
   * @returns {Promise<string>} - Category name
   */
  async getTabCategory(tab, aiModel) {
    try {
      // Create prompt with tab information
      const prompt = `Analyze this webpage and provide a single word that best categorizes it:
Title: ${tab.title}
URL: ${tab.url}

Respond with only a single word category name.`;

      // Get category from AI model
      const category = await aiModel.getCategory(prompt, tab);
      
      // Clean up category (remove quotes, extra spaces, etc.)
      return this.cleanCategory(category);
    } catch (error) {
      throw new Error(`Failed to categorize tab: ${error.message}`);
    }
  }

  /**
   * Clean up category name
   * @param {string} category - Raw category from AI
   * @returns {string} - Cleaned category name
   */
  cleanCategory(category) {
    // Remove quotes, extra spaces, and limit to one word
    return category.replace(/["']/g, '')
                  .trim()
                  .split(/\s+/)[0]
                  .toLowerCase();
  }

  /**
   * Create tab groups based on categories
   * @param {Object} tabGroups - Object mapping category names to arrays of tab IDs
   * @returns {Promise<void>}
   */
  async createTabGroups(tabGroups) {
    for (const [category, tabIds] of Object.entries(tabGroups)) {
      if (tabIds.length > 0) {
        await this.createTabGroup(tabIds, category);
      }
    }
  }

  /**
   * Create a tab group with the given tabs and name
   * @param {Array} tabIds - Array of tab IDs
   * @param {string} groupName - Name for the tab group
   * @returns {Promise<void>}
   */
  async createTabGroup(tabIds, groupName) {
    return new Promise((resolve, reject) => {
      chrome.tabs.group({ tabIds }, (groupId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          chrome.tabGroups.update(groupId, { title: groupName }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        }
      });
    });
  }
}