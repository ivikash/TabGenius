/**
 * Manages tab state for undo functionality
 */
export class TabStateManager {
  constructor() {
    this.previousState = null;
  }

  /**
   * Save the current state of tabs
   * @returns {Promise<void>}
   */
  async saveCurrentState() {
    try {
      const tabs = await this.getAllTabs();
      
      // Create a snapshot of the current tab state
      const tabState = {
        timestamp: Date.now(),
        tabs: tabs.map(tab => ({
          id: tab.id,
          index: tab.index,
          url: tab.url,
          title: tab.title,
          groupId: tab.groupId
        }))
      };
      
      this.previousState = tabState;
      console.log('Tab state saved:', tabState);
      
      return true;
    } catch (error) {
      console.error('Error saving tab state:', error);
      return false;
    }
  }

  /**
   * Check if there's a previous state to restore
   * @returns {boolean}
   */
  canUndo() {
    return this.previousState !== null;
  }

  /**
   * Restore tabs to their previous state
   * @returns {Promise<boolean>} - Whether the restore was successful
   */
  async restorePreviousState() {
    if (!this.canUndo()) {
      return false;
    }

    try {
      const previousState = this.previousState;
      
      // First, ungroup all tabs that were in groups
      await this.ungroupAllTabs();
      
      // Then reorder tabs to match previous state
      for (const tab of previousState.tabs) {
        try {
          await this.moveTabToIndex(tab.id, tab.index);
        } catch (error) {
          console.warn(`Could not move tab ${tab.id} to index ${tab.index}:`, error);
        }
      }
      
      // Clear the previous state after restoring
      this.previousState = null;
      
      return true;
    } catch (error) {
      console.error('Error restoring tab state:', error);
      return false;
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
          resolve(tabs);
        }
      });
    });
  }

  /**
   * Ungroup all tabs in the current window
   * @returns {Promise<void>}
   */
  async ungroupAllTabs() {
    try {
      const tabs = await this.getAllTabs();
      
      // Get all tabs that are in groups
      const groupedTabs = tabs.filter(tab => tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE);
      
      if (groupedTabs.length === 0) {
        return;
      }
      
      // Ungroup all tabs
      return new Promise((resolve, reject) => {
        chrome.tabs.ungroup(groupedTabs.map(tab => tab.id), () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Error ungrouping tabs:', error);
      throw error;
    }
  }

  /**
   * Move a tab to a specific index
   * @param {number} tabId - ID of the tab to move
   * @param {number} index - Index to move the tab to
   * @returns {Promise<void>}
   */
  async moveTabToIndex(tabId, index) {
    return new Promise((resolve, reject) => {
      chrome.tabs.move(tabId, { index }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
}