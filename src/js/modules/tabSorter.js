/**
 * Handles tab sorting functionality
 */
import debugLogger from './debugLogger.js';

export class TabSorter {
  constructor(tabStateManager) {
    this.tabStateManager = tabStateManager;
  }

  /**
   * Sort all tabs by title alphabetically
   * @returns {Promise<void>}
   */
  async sortByTitle() {
    try {
      debugLogger.log('Starting sort by title');
      
      // Save current state before sorting
      await this.tabStateManager.saveCurrentState();
      
      const tabs = await this.getAllTabs();
      debugLogger.log('Retrieved tabs for sorting', { count: tabs.length });
      
      const sortedTabs = this.sortTabsByProperty(tabs, 'title');
      debugLogger.log('Tabs sorted by title');
      
      await this.reorderTabs(sortedTabs);
    } catch (error) {
      console.error('Error sorting tabs by title:', error);
      throw new Error('Failed to sort tabs by title');
    }
  }

  /**
   * Sort all tabs by URL alphabetically
   * @returns {Promise<void>}
   */
  async sortByUrl() {
    try {
      debugLogger.log('Starting sort by URL');
      
      // Save current state before sorting
      await this.tabStateManager.saveCurrentState();
      
      const tabs = await this.getAllTabs();
      debugLogger.log('Retrieved tabs for URL sorting', { count: tabs.length });
      
      const sortedTabs = this.sortTabsByProperty(tabs, 'url');
      debugLogger.log('Tabs sorted by URL');
      
      await this.reorderTabs(sortedTabs);
    } catch (error) {
      debugLogger.error('Error sorting tabs by URL:', error);
      throw new Error('Failed to sort tabs by URL');
    }
  }

  /**
   * Get all tabs from the current window
   * @returns {Promise<Array>} - Array of tab objects
   */
  async getAllTabs() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          debugLogger.error('Error querying tabs:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          // Filter out chrome:// and chrome-extension:// URLs and pinned tabs
          const filteredTabs = tabs.filter(tab => {
            return !tab.url.startsWith('chrome://') && 
                   !tab.url.startsWith('chrome-extension://') &&
                   !tab.pinned;
          });
          debugLogger.log('Filtered tabs', { 
            total: tabs.length, 
            filtered: filteredTabs.length,
            pinned: tabs.length - filteredTabs.length 
          });
          resolve(filteredTabs);
        }
      });
    });
  }

  /**
   * Sort tabs by a specific property
   * @param {Array} tabs - Array of tab objects
   * @param {string} property - Property to sort by (title or url)
   * @returns {Array} - Sorted array of tab objects
   */
  sortTabsByProperty(tabs, property) {
    return [...tabs].sort((a, b) => {
      const valueA = a[property].toLowerCase();
      const valueB = b[property].toLowerCase();
      return valueA.localeCompare(valueB);
    });
  }

  /**
   * Reorder tabs according to the sorted array
   * @param {Array} sortedTabs - Sorted array of tab objects
   * @returns {Promise<void>}
   */
  async reorderTabs(sortedTabs) {
    debugLogger.log('Starting tab reordering', { tabCount: sortedTabs.length });
    
    const movePromises = sortedTabs.map((tab, index) => {
      return new Promise((resolve, reject) => {
        chrome.tabs.move(tab.id, { index }, () => {
          if (chrome.runtime.lastError) {
            debugLogger.error(`Error moving tab ${tab.id} to index ${index}:`, chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            debugLogger.log(`Moved tab ${tab.id} to index ${index}`);
            resolve();
          }
        });
      });
    });

    try {
      await Promise.all(movePromises);
      debugLogger.log('Tab reordering completed successfully');
    } catch (error) {
      debugLogger.error('Error during tab reordering:', error);
      throw error;
    }
  }
}