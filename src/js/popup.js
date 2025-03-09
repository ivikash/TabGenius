import { TabSorter } from './modules/tabSorter.js';
import { TabOrganizer } from './modules/tabOrganizer.js';
import { UIManager } from './modules/uiManager.js';
import { TabStateManager } from './modules/tabStateManager.js';
import { CategoryManager } from './modules/categoryManager.js';

document.addEventListener('DOMContentLoaded', async () => {
  const tabStateManager = new TabStateManager();
  const tabSorter = new TabSorter(tabStateManager);
  const tabOrganizer = new TabOrganizer(tabStateManager);
  const uiManager = new UIManager();
  const categoryManager = new CategoryManager();

  // Initialize UI components
  uiManager.init();
  
  // Initialize category manager
  try {
    await categoryManager.init();
  } catch (error) {
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
      await tabSorter.sortByTitle();
      uiManager.showStatus('Tabs sorted by title!', 'success');
      
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
      console.error('Error sorting by title:', error);
      
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
      await tabSorter.sortByUrl();
      uiManager.showStatus('Tabs sorted by URL!', 'success');
      
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
      console.error('Error sorting by URL:', error);
      
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
      
      uiManager.showStatus('Organizing tabs by content...', 'loading');
      await tabOrganizer.organizeByContent(modelConfig);
      uiManager.showStatus('Tabs organized by content!', 'success');
      
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
      console.error('Error organizing by content:', error);
      
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
});