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
      
      // Check if there are any grouped tabs
      const hasGroupedTabs = tabs.some(tab => 
        tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && tab.groupId !== -1
      );
      
      if (hasGroupedTabs) {
        // Sort tabs within their groups
        await this.sortTabsWithinGroups(tabs, 'title');
      } else {
        // Sort all tabs normally
        const sortedTabs = this.sortTabsByProperty(tabs, 'title');
        debugLogger.log('Tabs sorted by title');
        await this.reorderTabs(sortedTabs);
      }
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
      
      // Check if there are any grouped tabs
      const hasGroupedTabs = tabs.some(tab => 
        tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && tab.groupId !== -1
      );
      
      if (hasGroupedTabs) {
        // Sort tabs within their groups
        await this.sortTabsWithinGroups(tabs, 'url');
      } else {
        // Sort all tabs normally
        const sortedTabs = this.sortTabsByProperty(tabs, 'url');
        debugLogger.log('Tabs sorted by URL');
        await this.reorderTabs(sortedTabs);
      }
    } catch (error) {
      debugLogger.error('Error sorting tabs by URL:', error);
      throw new Error('Failed to sort tabs by URL');
    }
  }

  /**
   * Sort tabs within their respective groups
   * @param {Array} tabs - Array of tab objects
   * @param {string} property - Property to sort by (title or url)
   * @returns {Promise<void>}
   */
  async sortTabsWithinGroups(tabs, property) {
    try {
      debugLogger.log(`Sorting tabs within groups by ${property}`);
      
      // First, get all tab groups
      const groups = await new Promise((resolve, reject) => {
        chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT }, (groups) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(groups);
          }
        });
      });
      
      debugLogger.log('Found tab groups', { count: groups.length });
      
      // For each group, get its tabs and sort them
      for (const group of groups) {
        // Get all tabs in this group
        const groupTabs = tabs.filter(tab => tab.groupId === group.id);
        
        if (groupTabs.length === 0) {
          continue; // Skip empty groups
        }
        
        // Sort the tabs within this group
        const sortedGroupTabs = this.sortTabsByProperty(groupTabs, property);
        
        // Get the current index range of the group
        const groupStartIndex = Math.min(...groupTabs.map(t => t.index));
        
        debugLogger.log(`Sorting group ${group.id} (${group.title || 'Untitled'})`, {
          tabCount: sortedGroupTabs.length,
          startIndex: groupStartIndex
        });
        
        // Move each tab to its new position within the group's range
        for (let i = 0; i < sortedGroupTabs.length; i++) {
          const tab = sortedGroupTabs[i];
          const newIndex = groupStartIndex + i;
          if (tab.index !== newIndex) {
            await this.moveTabToIndex(tab.id, newIndex);
          }
        }
      }
      
      // Handle ungrouped tabs separately
      const ungroupedTabs = tabs.filter(tab => 
        tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE || tab.groupId === -1
      );
      
      if (ungroupedTabs.length > 0) {
        const sortedUngroupedTabs = this.sortTabsByProperty(ungroupedTabs, property);
        debugLogger.log('Sorting ungrouped tabs', { tabCount: sortedUngroupedTabs.length });
        
        // Find the index after all groups
        const lastGroupTab = tabs.filter(tab => 
          tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && tab.groupId !== -1
        ).sort((a, b) => b.index - a.index)[0];
        
        const startIndex = lastGroupTab ? lastGroupTab.index + 1 : 0;
        
        // Move ungrouped tabs to their new positions
        for (let i = 0; i < sortedUngroupedTabs.length; i++) {
          const tab = sortedUngroupedTabs[i];
          const newIndex = startIndex + i;
          if (tab.index !== newIndex) {
            await this.moveTabToIndex(tab.id, newIndex);
          }
        }
      }
      
      debugLogger.log('Tab sorting within groups completed');
    } catch (error) {
      debugLogger.error('Error sorting tabs within groups:', error);
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
          debugLogger.error(`Error moving tab ${tabId} to index ${index}:`, chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          debugLogger.log(`Moved tab ${tabId} to index ${index}`);
          resolve();
        }
      });
    });
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