import { TabSorter } from './modules/tabSorter.js';
import { TabOrganizer } from './modules/tabOrganizer.js';
import { UIManager } from './modules/uiManager.js';

document.addEventListener('DOMContentLoaded', () => {
  const tabSorter = new TabSorter();
  const tabOrganizer = new TabOrganizer();
  const uiManager = new UIManager();

  // Initialize UI components
  uiManager.init();

  // Sort by title button
  document.getElementById('sortByTitle').addEventListener('click', async () => {
    try {
      uiManager.showStatus('Sorting tabs by title...', 'loading');
      await tabSorter.sortByTitle();
      uiManager.showStatus('Tabs sorted by title!', 'success');
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
    } catch (error) {
      uiManager.showStatus(`Error: ${error.message}`, 'error');
      console.error('Error organizing by content:', error);
    }
  });
});