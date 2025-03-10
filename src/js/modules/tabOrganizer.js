/**
 * Tab Organizer for Tab Genius extension
 * Handles organizing tabs into groups based on content
 */
import debugLogger from './debugLogger.js';

export class TabOrganizer {
  constructor(tabStateManager) {
    this.tabStateManager = tabStateManager;
  }

  /**
   * Organize tabs by content using AI
   * @param {Object} modelConfig - Configuration for the AI model
   * @returns {Promise<void>}
   */
  async organizeByContent(modelConfig) {
    try {
      debugLogger.log('Starting tab organization', modelConfig);
      
      // Save current state before organizing
      await this.tabStateManager.saveCurrentState();
      
      // Get all tabs in current window
      const tabs = await chrome.tabs.query({ currentWindow: true });
      debugLogger.log('Found tabs', { count: tabs.length });
      
      // Skip pinned tabs
      const unpinnedTabs = tabs.filter(tab => !tab.pinned);
      debugLogger.log('Unpinned tabs', { count: unpinnedTabs.length });
      
      if (unpinnedTabs.length === 0) {
        throw new Error('No unpinned tabs to organize');
      }
      
      // Check if notifications are enabled
      const notificationPrefs = await new Promise(resolve => {
        chrome.storage.sync.get('notificationsEnabled', resolve);
      });
      
      // Show notification that analysis has started if enabled
      if (notificationPrefs.notificationsEnabled !== false) {
        chrome.runtime.sendMessage({
          action: 'showNotification',
          title: 'Tab Genius',
          message: `Analyzing ${unpinnedTabs.length} tabs...`
        });
      }
      
      // Analyze each tab and get categories
      const tabCategories = await this.analyzeTabs(unpinnedTabs, modelConfig);
      
      // Group tabs by category
      await this.groupTabsByCategory(tabCategories);
      
      return true;
    } catch (error) {
      console.error('Error organizing tabs by content:', error);
      throw error;
    }
  }

  /**
   * Analyze tabs using the selected AI model
   * @param {Array} tabs - Array of tabs to analyze
   * @param {Object} modelConfig - Configuration for the AI model
   * @returns {Promise<Object>} - Object mapping tab IDs to categories
   */
  async analyzeTabs(tabs, modelConfig) {
    const tabCategories = {};
    
    // Get timeout setting and custom prompt
    const settings = await chrome.storage.sync.get(['analysisTimeout', 'tabSorterCategories', 'analysisPrompt']);
    const timeoutSeconds = settings.analysisTimeout || 15;
    const availableCategories = settings.tabSorterCategories || [];
    const prompt = settings.analysisPrompt || "Analyze this web page content and categorize it into a single category. Choose a concise 1-2 word category name. Include one relevant emoji before the category name.";
    
    debugLogger.log('Starting tab analysis', {
      tabCount: tabs.length,
      timeoutSeconds: timeoutSeconds,
      modelType: modelConfig.type,
      prompt: prompt,
      availableCategories: Array.isArray(availableCategories) && availableCategories.length > 0 ? availableCategories.length : 'using defaults'
    });
    
    // Process tabs in batches to avoid overwhelming the browser
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < tabs.length; i += batchSize) {
      batches.push(tabs.slice(i, i + batchSize));
    }
    
    let processedCount = 0;
    const totalCount = tabs.length;
    
    // Check if notifications are enabled
    const notificationPrefs = await new Promise(resolve => {
      chrome.storage.sync.get('notificationsEnabled', resolve);
    });
    const notificationsEnabled = notificationPrefs.notificationsEnabled !== false;
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (tab) => {
        try {
          // Skip tabs that are likely to cause errors (error pages, etc.)
          if (tab.url.includes('chrome-error://') || 
              tab.status === 'loading' || 
              tab.title.includes('ERR_') || 
              tab.title.includes('Error')) {
            
            // Use the tab's domain as a fallback category
            let domain = 'Unknown';
            try {
              if (tab.url.startsWith('http')) {
                const url = new URL(tab.url);
                domain = url.hostname.replace('www.', '').split('.')[0];
                // Capitalize first letter
                domain = domain.charAt(0).toUpperCase() + domain.slice(1);
              }
            } catch (e) {
              console.error('Error parsing URL:', e);
            }
            
            tabCategories[tab.id] = domain || 'Error';
            processedCount++;
            
            // Update progress notification every 5 tabs if notifications are enabled
            if (notificationsEnabled && (processedCount % 5 === 0 || processedCount === totalCount)) {
              chrome.runtime.sendMessage({
                action: 'showNotification',
                title: 'Tab Genius',
                message: `Analyzing tabs: ${processedCount}/${totalCount}`
              });
            }
            
            return;
          }
          
          let result;
          
          if (modelConfig.type === 'gemini') {
            // Use Google's Gemini API
            result = await this.analyzeWithGemini(prompt, tab.id);
          } else if (modelConfig.type === 'ollama') {
            // Use Ollama API
            result = await this.analyzeWithOllama(
              modelConfig.url,
              modelConfig.model,
              prompt,
              tab.id
            );
          } else {
            throw new Error(`Unknown model type: ${modelConfig.type}`);
          }
          
          if (result && result.category) {
            tabCategories[tab.id] = result.category;
          } else if (result && result.error) {
            console.error(`Error analyzing tab ${tab.id}:`, result.error);
            tabCategories[tab.id] = 'Misc';
          } else {
            tabCategories[tab.id] = 'Misc';
          }
          
          processedCount++;
          
          // Update progress notification every 5 tabs if notifications are enabled
          if (notificationsEnabled && (processedCount % 5 === 0 || processedCount === totalCount)) {
            chrome.runtime.sendMessage({
              action: 'showNotification',
              title: 'Tab Genius',
              message: `Analyzing tabs: ${processedCount}/${totalCount}`
            });
          }
        } catch (error) {
          console.error(`Error analyzing tab ${tab.id}:`, error);
          tabCategories[tab.id] = 'Misc';
          processedCount++;
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    return tabCategories;
  }

  /**
   * Analyze tab with Google's Gemini API
   * @param {string} prompt - Prompt for the AI model
   * @param {number} tabId - ID of the tab to analyze
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeWithGemini(prompt, tabId) {
    try {
      // Get the timeout setting or use default
      const result = await new Promise(resolve => {
        chrome.storage.sync.get(['analysisTimeout', 'analysisPrompt', 'tabSorterCategories'], resolve);
      });
      
      const timeoutSeconds = result.analysisTimeout || 15;
      const customPrompt = result.analysisPrompt || prompt;
      const categories = result.tabSorterCategories || [];
      
      debugLogger.log(`Analyzing tab ${tabId} with Gemini`, {
        timeoutSeconds: timeoutSeconds,
        prompt: customPrompt,
        categoriesCount: categories.length
      });
      
      // Create a promise that will resolve with the message response or reject on timeout
      const analysisPromise = new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'analyzeWithGemini',
            prompt: customPrompt,
            tabId: tabId,
            categories: categories
          },
          (response) => {
            if (chrome.runtime.lastError) {
              debugLogger.warn(`Error in Gemini analysis for tab ${tabId}:`, chrome.runtime.lastError);
              resolve({ category: 'Misc', error: chrome.runtime.lastError.message });
            } else if (response && response.error) {
              debugLogger.warn(`Error response from Gemini for tab ${tabId}:`, response.error);
              resolve({ category: 'Misc', error: response.error });
            } else if (!response) {
              debugLogger.warn(`No response from Gemini for tab ${tabId}`);
              resolve({ category: 'Misc', error: 'No response' });
            } else {
              debugLogger.log(`Gemini analysis for tab ${tabId} complete:`, {
                category: response.category,
                tabId: tabId
              });
              resolve(response);
            }
          }
        );
      });
      
      // Create a timeout promise
      const timeoutPromise = new Promise(resolve => {
        setTimeout(() => {
          debugLogger.warn(`Analysis timeout for tab ${tabId}, falling back to default category`, {
            timeoutSeconds: timeoutSeconds
          });
          resolve({ category: 'Misc', error: 'Analysis timeout' });
        }, timeoutSeconds * 1000);
      });
      
      // Race the analysis against the timeout
      return await Promise.race([analysisPromise, timeoutPromise]);
    } catch (error) {
      debugLogger.error(`Unexpected error in Gemini analysis for tab ${tabId}:`, error);
      return { category: 'Misc', error: error.message };
    }
  }

  /**
   * Analyze tab with Ollama API
   * @param {string} url - URL for Ollama API
   * @param {string} model - Model name for Ollama
   * @param {string} prompt - Prompt for the AI model
   * @param {number} tabId - ID of the tab to analyze
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeWithOllama(url, model, prompt, tabId) {
    try {
      // Get the timeout setting or use default
      const result = await new Promise(resolve => {
        chrome.storage.sync.get(['analysisTimeout', 'analysisPrompt'], resolve);
      });
      
      const timeoutSeconds = result.analysisTimeout || 15;
      const customPrompt = result.analysisPrompt || prompt;
      
      debugLogger.log(`Analyzing tab ${tabId} with Ollama`, {
        timeoutSeconds: timeoutSeconds,
        url: url,
        model: model,
        prompt: customPrompt
      });
      
      // Create a promise that will resolve with the message response or reject on timeout
      const analysisPromise = new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'analyzeWithOllama',
            url: url,
            model: model,
            prompt: customPrompt,
            tabId: tabId
          },
          (response) => {
            if (chrome.runtime.lastError) {
              debugLogger.warn(`Error in Ollama analysis for tab ${tabId}:`, chrome.runtime.lastError);
              resolve({ category: 'Misc', error: chrome.runtime.lastError.message });
            } else if (response && response.error) {
              debugLogger.warn(`Error response from Ollama for tab ${tabId}:`, response.error);
              resolve({ category: 'Misc', error: response.error });
            } else if (!response) {
              debugLogger.warn(`No response from Ollama for tab ${tabId}`);
              resolve({ category: 'Misc', error: 'No response' });
            } else {
              debugLogger.log(`Ollama analysis for tab ${tabId} complete:`, {
                category: response.category,
                tabId: tabId
              });
              resolve(response);
            }
          }
        );
      });
      
      // Create a timeout promise
      const timeoutPromise = new Promise(resolve => {
        setTimeout(() => {
          debugLogger.warn(`Analysis timeout for tab ${tabId}, falling back to default category`, {
            timeoutSeconds: timeoutSeconds
          });
          resolve({ category: 'Misc', error: 'Analysis timeout' });
        }, timeoutSeconds * 1000);
      });
      
      // Race the analysis against the timeout
      return await Promise.race([analysisPromise, timeoutPromise]);
    } catch (error) {
      debugLogger.error(`Unexpected error in Ollama analysis for tab ${tabId}:`, error);
      return { category: 'Misc', error: error.message };
    }
  }
            resolve({ category: 'Misc', error: 'No response' });
          } else {
            debugLogger.log(`Ollama analysis for tab ${tabId} complete:`, {
              category: response.category,
              tabId: tabId
            });
            resolve(response);
          }
        }
      );
    });
  });
}

  /**
   * Group tabs by category
   * @param {Object} tabCategories - Object mapping tab IDs to categories
   * @returns {Promise<void>}
   */
  async groupTabsByCategory(tabCategories) {
    // Get unique categories
    const categories = [...new Set(Object.values(tabCategories))];
    
    debugLogger.log('Grouping tabs by categories', {
      uniqueCategories: categories,
      tabCount: Object.keys(tabCategories).length
    });
    
    // Create tab groups for each category
    for (const category of categories) {
      // Get tab IDs for this category
      const tabIds = Object.entries(tabCategories)
        .filter(([_, cat]) => cat === category)
        .map(([tabId, _]) => parseInt(tabId));
      
      if (tabIds.length > 0) {
        try {
          debugLogger.log(`Creating group for category "${category}"`, {
            tabCount: tabIds.length,
            tabIds: tabIds
          });
          
          // Create a group for these tabs
          const groupId = await chrome.tabs.group({ tabIds });
          
          // Set group title and color
          await chrome.tabGroups.update(groupId, {
            title: category,
            color: this.getCategoryColor(category)
          });
          
          debugLogger.log(`Group created for "${category}"`, {
            groupId: groupId,
            color: this.getCategoryColor(category)
          });
        } catch (error) {
          debugLogger.error(`Error creating group for category ${category}:`, error);
        }
      }
    }
  }

  /**
   * Get a consistent color for a category
   * @param {string} category - Category name
   * @returns {string} - Color name from Chrome's supported colors
   */
  getCategoryColor(category) {
    // Chrome's supported colors
    const colors = [
      'grey', 'blue', 'red', 'yellow', 'green',
      'pink', 'purple', 'cyan', 'orange'
    ];
    
    // Generate a consistent index based on the category name
    const hash = category.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    // Use modulo to get an index within the colors array
    return colors[hash % colors.length];
  }
}
