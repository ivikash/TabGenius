import { TabSorter } from './modules/tabSorter.js';
import { TabOrganizer } from './modules/tabOrganizer.js';
import { UIManager } from './modules/uiManager.js';
import { TabStateManager } from './modules/tabStateManager.js';

document.addEventListener('DOMContentLoaded', () => {
  const tabStateManager = new TabStateManager();
  const tabSorter = new TabSorter(tabStateManager);
  const tabOrganizer = new TabOrganizer(tabStateManager);
  const uiManager = new UIManager();

  // Initialize UI components
  uiManager.init();

  // Sort by title button
  document.getElementById('sortByTitle').addEventListener('click', async () => {
    try {
      uiManager.showStatus('Sorting tabs by title...', 'loading');
      await tabSorter.sortByTitle();
      uiManager.showStatus('Tabs sorted by title!', 'success');
      document.getElementById('undoButton').disabled = false;
    } catch (error) {
      uiManager.showStatus(`Error: ${error.message}`, 'error');
      console.error('Error sorting by title:', error);
    }
  });

  // Sort by URL button
  document.getElementById('sortByUrl').addEventListener('click', async () => {
    try {
      uiManager.showStatus('Sorting tabs by URL...', 'loading');
      await tabSorter.sortByUrl();
      uiManager.showStatus('Tabs sorted by URL!', 'success');
      document.getElementById('undoButton').disabled = false;
    } catch (error) {
      uiManager.showStatus(`Error: ${error.message}`, 'error');
      console.error('Error sorting by URL:', error);
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
      const modelType = document.getElementById('model-select').value;
      let modelConfig = { type: modelType };
      
      if (modelType === 'ollama') {
        modelConfig.url = document.getElementById('ollama-url').value;
        modelConfig.model = document.getElementById('ollama-model').value;
      }
      
      uiManager.showStatus('Organizing tabs by content...', 'loading');
      await tabOrganizer.organizeByContent(modelConfig);
      uiManager.showStatus('Tabs organized by content!', 'success');
      document.getElementById('undoButton').disabled = false;
    } catch (error) {
      uiManager.showStatus(`Error: ${error.message}`, 'error');
      console.error('Error organizing by content:', error);
    }
  });
  
  // Undo button
  document.getElementById('undoButton').addEventListener('click', async () => {
    try {
      if (!tabStateManager.canUndo()) {
        uiManager.showStatus('Nothing to undo', 'error');
        return;
      }
      
      uiManager.showStatus('Restoring previous tab state...', 'loading');
      const success = await tabStateManager.restorePreviousState();
      
      if (success) {
        uiManager.showStatus('Previous tab state restored!', 'success');
        document.getElementById('undoButton').disabled = true;
      } else {
        uiManager.showStatus('Failed to restore previous state', 'error');
      }
    } catch (error) {
      uiManager.showStatus(`Error: ${error.message}`, 'error');
      console.error('Error undoing action:', error);
    }
  });
});