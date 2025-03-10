import { TabSorter } from './modules/tabSorter.js';
import { TabOrganizer } from './modules/tabOrganizer.js';
import { UIManager } from './modules/uiManager.js';
import { TabStateManager } from './modules/tabStateManager.js';
import { CategoryManager } from './modules/categoryManager.js';
import debugLogger from './modules/debugLogger.js';

document.addEventListener('DOMContentLoaded', async () => {
  debugLogger.log('Popup initialized');
  const tabStateManager = new TabStateManager();
  const tabSorter = new TabSorter(tabStateManager);
  const tabOrganizer = new TabOrganizer(tabStateManager);
  const uiManager = new UIManager();
  const categoryManager = new CategoryManager();

  // Load and log all settings
  try {
    const settings = await chrome.storage.sync.get([
      'tabGeniusDebugMode', 
      'notificationsEnabled', 
      'analysisTimeout',
      'tabSorterCategories'
    ]);
    
    debugLogger.log('Extension settings loaded:', {
      debugMode: settings.tabGeniusDebugMode === true,
      notificationsEnabled: settings.notificationsEnabled !== false,
      analysisTimeout: settings.analysisTimeout || 15,
      categoriesCount: settings.tabSorterCategories ? settings.tabSorterCategories.length : 'default'
    });
  } catch (error) {
    debugLogger.error('Error loading settings:', error);
  }

  // Initialize UI components
  uiManager.init();
  debugLogger.log('UI initialized');
  
  // Initialize category manager
  try {
    await categoryManager.init();
    debugLogger.log('Category manager initialized');
  } catch (error) {
    debugLogger.error('Error initializing category manager:', error);
    console.error('Error initializing category manager:', error);
  }

  // Sort by title button
  document.getElementById('sortByTitle').addEventListener('click', async () => {
    try {
      // Disable action buttons during operation
      uiManager.setButtonsState({
        'sortByTitle': false,
        'sortByUrl': false,
        'organizeByContent': false,
        'ungroupAllTabs': false
      });
      
      uiManager.showStatus('Sorting tabs by title...', 'loading');
      debugLogger.log('Starting sort by title');
      
      await debugLogger.time('Sort by title', async () => {
        await tabSorter.sortByTitle();
      });
      
      uiManager.showStatus('Tabs sorted by title!', 'success');
      debugLogger.log('Tabs sorted by title successfully');
      
      // Enable undo button and re-enable action buttons
      uiManager.setButtonsState({
        'undoButton': true,
        'sortByTitle': true,
        'sortByUrl': true,
        'organizeByContent': true,
        'ungroupAllTabs': true
      });
    } catch (error) {
      uiManager.showStatus(`Error: ${error.message}`, 'error');
      debugLogger.error('Error sorting by title:', error);
      
      // Re-enable action buttons
      uiManager.setButtonsState({
        'sortByTitle': true,
        'sortByUrl': true,
        'organizeByContent': true,
        'ungroupAllTabs': true
      });
    }
  });

  // Sort by URL button
  document.getElementById('sortByUrl').addEventListener('click', async () => {
    try {
      // Disable action buttons during operation
      uiManager.setButtonsState({
        'sortByTitle': false,
        'sortByUrl': false,
        'organizeByContent': false,
        'ungroupAllTabs': false
      });
      
      uiManager.showStatus('Sorting tabs by URL...', 'loading');
      debugLogger.log('Starting sort by URL');
      
      await debugLogger.time('Sort by URL', async () => {
        await tabSorter.sortByUrl();
      });
      
      uiManager.showStatus('Tabs sorted by URL!', 'success');
      debugLogger.log('Tabs sorted by URL successfully');
      
      // Enable undo button and re-enable action buttons
      uiManager.setButtonsState({
        'undoButton': true,
        'sortByTitle': true,
        'sortByUrl': true,
        'organizeByContent': true,
        'ungroupAllTabs': true
      });
    } catch (error) {
      uiManager.showStatus(`Error: ${error.message}`, 'error');
      debugLogger.error('Error sorting by URL:', error);
      
      // Re-enable action buttons
      uiManager.setButtonsState({
        'sortByTitle': true,
        'sortByUrl': true,
        'organizeByContent': true,
        'ungroupAllTabs': true
      });
    }
  });

  // Model selection change
  document.getElementById('model-select').addEventListener('change', (e) => {
    const modelType = e.target.value;
    uiManager.toggleOllamaOptions(modelType === 'ollama');
  });

  // Organize by content button
  document.getElementById('organizeByContent').addEventListener('click', async () => {
    try {
      // Disable action buttons during operation
      uiManager.setButtonsState({
        'sortByTitle': false,
        'sortByUrl': false,
        'organizeByContent': false,
        'ungroupAllTabs': false
      });
      
      const modelType = document.getElementById('model-select').value;
      let modelConfig = { type: modelType };
      
      if (modelType === 'ollama') {
        modelConfig.url = document.getElementById('ollama-url').value;
        modelConfig.model = document.getElementById('ollama-model').value;
      }
      
      // Get analysis timeout setting
      const settings = await chrome.storage.sync.get(['analysisTimeout', 'tabSorterCategories']);
      const timeout = settings.analysisTimeout || 15;
      const categories = settings.tabSorterCategories || categoryManager.defaultCategories;
      
      debugLogger.log('Starting tab organization with:', {
        modelType: modelType,
        analysisTimeout: timeout,
        categoriesCount: categories.length,
        categories: categories,
        modelConfig: modelConfig
      });
      
      uiManager.showStatus('Organizing tabs by content...', 'loading');
      
      await debugLogger.time('Tab organization', async () => {
        await tabOrganizer.organizeByContent(modelConfig);
      });
      
      uiManager.showStatus('Tabs organized by content!', 'success');
      debugLogger.log('Tab organization completed successfully');
      
      // Enable undo button and re-enable action buttons
      uiManager.setButtonsState({
        'undoButton': true,
        'sortByTitle': true,
        'sortByUrl': true,
        'organizeByContent': true,
        'ungroupAllTabs': true
      });
    } catch (error) {
      uiManager.showStatus(`Error: ${error.message}`, 'error');
      debugLogger.error('Error organizing by content:', error);
      
      // Re-enable action buttons
      uiManager.setButtonsState({
        'sortByTitle': true,
        'sortByUrl': true,
        'organizeByContent': true,
        'ungroupAllTabs': true
      });
    }
  });
  
  // Ungroup all tabs button
  document.getElementById('ungroupAllTabs').addEventListener('click', async () => {
    try {
      // Disable action buttons during operation
      uiManager.setButtonsState({
        'sortByTitle': false,
        'sortByUrl': false,
        'organizeByContent': false,
        'ungroupAllTabs': false
      });
      
      // Save current state before ungrouping
      await tabStateManager.saveCurrentState();
      
      uiManager.showStatus('Removing all tab groups...', 'loading');
      await tabStateManager.ungroupAllTabs();
      uiManager.showStatus('All tab groups removed!', 'success');
      
      // Enable undo button and re-enable action buttons
      uiManager.setButtonsState({
        'undoButton': true,
        'sortByTitle': true,
        'sortByUrl': true,
        'organizeByContent': true,
        'ungroupAllTabs': true
      });
    } catch (error) {
      uiManager.showStatus(`Error: ${error.message}`, 'error');
      console.error('Error ungrouping tabs:', error);
      
      // Re-enable action buttons
      uiManager.setButtonsState({
        'sortByTitle': true,
        'sortByUrl': true,
        'organizeByContent': true,
        'ungroupAllTabs': true
      });
    }
  });
  
  // Undo button
  document.getElementById('undoButton').addEventListener('click', async () => {
    try {
      if (!tabStateManager.canUndo()) {
        uiManager.showStatus('Nothing to undo', 'error');
        return;
      }
      
      // Disable all buttons during undo operation
      uiManager.setButtonsState({
        'sortByTitle': false,
        'sortByUrl': false,
        'organizeByContent': false,
        'ungroupAllTabs': false,
        'undoButton': false
      });
      
      uiManager.showStatus('Restoring previous tab state...', 'loading');
      const success = await tabStateManager.restorePreviousState();
      
      if (success) {
        uiManager.showStatus('Previous tab state restored!', 'success');
        // Disable undo button since we've used the saved state
        uiManager.setButtonEnabled('undoButton', false);
      } else {
        uiManager.showStatus('Failed to restore previous state', 'error');
      }
      
      // Re-enable action buttons
      uiManager.setButtonsState({
        'sortByTitle': true,
        'sortByUrl': true,
        'organizeByContent': true,
        'ungroupAllTabs': true
      });
    } catch (error) {
      uiManager.showStatus(`Error: ${error.message}`, 'error');
      console.error('Error undoing action:', error);
      
      // Re-enable action buttons
      uiManager.setButtonsState({
        'sortByTitle': true,
        'sortByUrl': true,
        'organizeByContent': true,
        'ungroupAllTabs': true
      });
    }
  });
  
  // Initialize settings
  chrome.storage.sync.get(['notificationsEnabled', 'analysisTimeout', 'tabGeniusDebugMode'], (result) => {
    // Set notifications checkbox
    const notificationsCheckbox = document.getElementById('enableNotifications');
    if (notificationsCheckbox) {
      notificationsCheckbox.checked = result.notificationsEnabled !== false;
      notificationsCheckbox.addEventListener('change', (e) => {
        chrome.storage.sync.set({ notificationsEnabled: e.target.checked });
      });
    }
    
    // Set analysis timeout input
    const timeoutInput = document.getElementById('analysisTimeout');
    if (timeoutInput) {
      timeoutInput.value = result.analysisTimeout || 15;
      timeoutInput.addEventListener('change', (e) => {
        // Ensure value is between min and max
        const value = Math.min(Math.max(parseInt(e.target.value) || 15, 5), 60);
        e.target.value = value;
        chrome.storage.sync.set({ analysisTimeout: value });
      });
    }
    
    // Set debug mode checkbox
    const debugModeCheckbox = document.getElementById('enableDebugMode');
    if (debugModeCheckbox) {
      debugModeCheckbox.checked = result.tabGeniusDebugMode === true;
      debugModeCheckbox.addEventListener('change', (e) => {
        debugLogger.setDebugMode(e.target.checked);
        debugLogger.log('Debug mode changed:', e.target.checked);
      });
    }
  });
});