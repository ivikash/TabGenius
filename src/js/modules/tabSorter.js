/**
 * Handles tab sorting functionality
 */
export class TabSorter {
  /**
   * Sort all tabs by title alphabetically
   * @returns {Promise<void>}
   */
  async sortByTitle() {
    try {
      const tabs = await this.getAllTabs();
      const sortedTabs = this.sortTabsByProperty(tabs, 'title');
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
      const tabs = await this.getAllTabs();
      const sortedTabs = this.sortTabsByProperty(tabs, 'url');
      await this.reorderTabs(sortedTabs);
    } catch (error) {
      console.error('Error sorting tabs by URL:', error);
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
    const movePromises = sortedTabs.map((tab, index) => {
      return new Promise((resolve, reject) => {
        chrome.tabs.move(tab.id, { index }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    });

    await Promise.all(movePromises);
  }
}