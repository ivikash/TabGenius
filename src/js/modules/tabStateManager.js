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
      
      // Get all tab groups
      const groups = await new Promise((resolve, reject) => {
        chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT }, (groups) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(groups);
          }
        });
      });
      
      // Create a map of group information
      const groupInfo = {};
      groups.forEach(group => {
        groupInfo[group.id] = {
          title: group.title,
          color: group.color
        };
      });
      
      // Create a snapshot of the current tab state
      const tabState = {
        timestamp: Date.now(),
        tabs: tabs.map(tab => ({
          id: tab.id,
          index: tab.index,
          url: tab.url,
          title: tab.title,
          groupId: tab.groupId
        })),
        groups: groupInfo
      };
      
      debugLogger.log('Tab state saved', { 
        timestamp: new Date(tabState.timestamp).toISOString(),
        tabCount: tabState.tabs.length,
        groupCount: Object.keys(groupInfo).length
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
      
      // First, get current tabs to check which ones still exist
      const currentTabs = await this.getAllTabs();
      const currentTabIds = new Set(currentTabs.map(tab => tab.id));
      
      // Filter out tabs that no longer exist
      const validTabs = previousState.tabs.filter(tab => currentTabIds.has(tab.id));
      
      if (validTabs.length === 0) {
        debugLogger.log('No valid tabs to restore');
        return false;
      }
      
      // First, ungroup all tabs that are currently in groups
      await this.ungroupAllTabs();
      
      // Then reorder tabs to match previous state
      for (const tab of validTabs) {
        try {
          await this.moveTabToIndex(tab.id, tab.index);
        } catch (error) {
          debugLogger.warn(`Could not move tab ${tab.id} to index ${tab.index}:`, error);
        }
      }
      
      // Finally, restore tab groups if they existed
      const tabsWithGroups = validTabs.filter(tab => 
        tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && tab.groupId !== -1
      );
      
      if (tabsWithGroups.length > 0) {
        // Group tabs by their previous groupId
        const groupMap = new Map();
        for (const tab of tabsWithGroups) {
          if (!groupMap.has(tab.groupId)) {
            groupMap.set(tab.groupId, []);
          }
          groupMap.get(tab.groupId).push(tab.id);
        }
        
        // Restore each group with its title and color
        for (const [groupId, tabIds] of groupMap.entries()) {
          try {
            // Only create groups that have at least one tab
            if (tabIds.length > 0) {
              const newGroupId = await this.createTabGroup(tabIds);
              
              // Restore group title and color if available
              if (previousState.groups && previousState.groups[groupId]) {
                const groupInfo = previousState.groups[groupId];
                if (groupInfo.title) {
                  await this.updateTabGroup(newGroupId, {
                    title: groupInfo.title,
                    color: groupInfo.color || 'grey'
                  });
                }
              }
            }
          } catch (error) {
            debugLogger.warn(`Could not restore group for tabs ${tabIds}:`, error);
          }
        }
      }
      
      // Clear the previous state after restoring
      this.previousState = null;
      
      return true;
    } catch (error) {
      debugLogger.error('Error restoring tab state:', error);
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
   * Update a tab group's properties
   * @param {number} groupId - ID of the group to update
   * @param {Object} properties - Properties to update (title, color)
   * @returns {Promise<void>}
   */
  async updateTabGroup(groupId, properties) {
    return new Promise((resolve, reject) => {
      chrome.tabGroups.update(groupId, properties, () => {
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