/**
 * Manages tab state for undo functionality
 */
import debugLogger from './debugLogger.js';

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
      debugLogger.log('Saving current tab state');
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
      
      debugLogger.log('Tab state saved', { 
        timestamp: new Date(tabState.timestamp).toISOString(),
        tabCount: tabState.tabs.length
      });
      
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
      
      // Finally, restore tab groups if they existed
      const tabsWithGroups = previousState.tabs.filter(tab => 
        tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && tab.groupId !== -1
      );
      
      // Group tabs by their previous groupId
      const groupMap = new Map();
      for (const tab of tabsWithGroups) {
        if (!groupMap.has(tab.groupId)) {
          groupMap.set(tab.groupId, []);
        }
        groupMap.get(tab.groupId).push(tab.id);
      }
      
      // Restore each group
      for (const [groupId, tabIds] of groupMap.entries()) {
        try {
          await this.createTabGroup(tabIds);
        } catch (error) {
          console.warn(`Could not restore group for tabs ${tabIds}:`, error);
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
      const groupedTabs = tabs.filter(tab => tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && tab.groupId !== -1);
      
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

  /**
   * Create a tab group from a list of tab IDs
   * @param {Array<number>} tabIds - Array of tab IDs to group
   * @returns {Promise<number>} - ID of the created group
   */
  async createTabGroup(tabIds) {
    return new Promise((resolve, reject) => {
      chrome.tabs.group({ tabIds }, (groupId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(groupId);
        }
      });
    });
  }
}