/**
 * Background script for Tab Sorter extension
 * Handles API calls and tab content extraction
 */

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle different message actions
  switch (request.action) {
    case 'analyzeWithGemini':
      analyzeWithGemini(request.prompt, request.tabId)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Indicates async response

    case 'analyzeWithOllama':
      analyzeWithOllama(request.url, request.model, request.prompt, request.tabId)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Indicates async response

    default:
      sendResponse({ error: 'Unknown action' });
      return false;
  }
});

/**
 * Analyze tab content with Chrome's Gemini API
 * @param {string} prompt - Prompt for the AI model
 * @param {number} tabId - ID of the tab to analyze
 * @returns {Promise<Object>} - Analysis result
 */
async function analyzeWithGemini(prompt, tabId) {
  try {
    // Get tab content
    const content = await getTabContent(tabId);
    
    // Prepare prompt with content
    const fullPrompt = `${prompt}\n\nContent: ${content}`;
    
    // Use Chrome's Gemini API (this is a placeholder - actual implementation depends on Chrome's API)
    // In a real implementation, you would use the appropriate Chrome API for Gemini
    const response = await chrome.runtime.sendNativeMessage(
      'com.google.chrome.gemini',
      { prompt: fullPrompt }
    );
    
    return { category: response.text.trim() };
  } catch (error) {
    console.error('Error analyzing with Gemini:', error);
    throw new Error('Failed to analyze with Gemini');
  }
}

/**
 * Analyze tab content with Ollama API
 * @param {string} url - URL for Ollama API
 * @param {string} model - Model name for Ollama
 * @param {string} prompt - Prompt for the AI model
 * @param {number} tabId - ID of the tab to analyze
 * @returns {Promise<Object>} - Analysis result
 */
async function analyzeWithOllama(url, model, prompt, tabId) {
  try {
    // Get tab content
    const content = await getTabContent(tabId);
    
    // Prepare prompt with content
    const fullPrompt = `${prompt}\n\nContent: ${content}`;
    
    // Make request to Ollama API
    const response = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: fullPrompt,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    
    const data = await response.json();
    return { category: data.response.trim() };
  } catch (error) {
    console.error('Error analyzing with Ollama:', error);
    throw new Error('Failed to analyze with Ollama');
  }
}

/**
 * Get content from a tab
 * @param {number} tabId - ID of the tab
 * @returns {Promise<string>} - Tab content
 */
async function getTabContent(tabId) {
  try {
    // Check if tab exists and is accessible
    const tab = await chrome.tabs.get(tabId);
    
    // Skip chrome:// and chrome-extension:// URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot access Chrome internal pages');
    }
    
    // Execute content script to extract page content
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: extractPageContent
    });
    
    // Return extracted content
    return results[0].result;
  } catch (error) {
    console.error('Error getting tab content:', error);
    throw new Error('Failed to access tab content');
  }
}

/**
 * Extract content from the current page
 * This function runs in the context of the tab
 * @returns {string} - Extracted content
 */
function extractPageContent() {
  try {
    // Get page title
    const title = document.title || '';
    
    // Get meta description
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    
    // Get main content (prioritize main content areas)
    const mainContent = document.querySelector('main')?.innerText || 
                        document.querySelector('article')?.innerText || 
                        document.querySelector('#content')?.innerText || 
                        document.querySelector('.content')?.innerText || 
                        '';
    
    // Get headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.innerText)
      .join(' ');
    
    // Combine all content
    const combinedContent = [title, metaDescription, headings, mainContent]
      .filter(Boolean)
      .join(' ')
      .substring(0, 1000); // Limit content length
    
    return combinedContent || 'No content available';
  } catch (error) {
    console.error('Error extracting page content:', error);
    return 'Error extracting content';
  }
}