/**
 * Background script for Tab Sorter extension
 * Handles API calls and tab content extraction
 */
import debugLogger from './modules/debugLogger.js';
import analytics from './modules/analytics.js';

// Predefined categories for consistent grouping
let PREDEFINED_CATEGORIES = [
  'News', 'Shopping', 'Media', 'Education', 'Social', 
  'Tech', 'Games', 'Finance', 'Travel', 'Food',
  'Health', 'Sports', 'Entertainment', 'Business', 'Reference',
  'Productivity', 'Development', 'Science', 'Arts', 'Learning',
  'Leadership', 'Research', 'Career', 'Networking', 'Analytics',
  'Marketing', 'Design', 'Documentation', 'Communication', 'Misc'
];

// Log startup information
debugLogger.log('Background script initialized', {
  timestamp: new Date().toISOString(),
  version: chrome.runtime.getManifest().version
});

// Load all settings on startup
chrome.storage.sync.get(null, (allSettings) => {
  if (chrome.runtime.lastError) {
    debugLogger.error('Error loading settings:', chrome.runtime.lastError);
    return;
  }
  
  debugLogger.log('All extension settings:', {
    debugMode: allSettings.tabGeniusDebugMode === true,
    notificationsEnabled: allSettings.notificationsEnabled !== false,
    analysisTimeout: allSettings.analysisTimeout || 15,
    hasCustomCategories: !!allSettings.tabSorterCategories,
    categoriesCount: allSettings.tabSorterCategories ? allSettings.tabSorterCategories.length : PREDEFINED_CATEGORIES.length
  });
});

// Load user-defined categories from storage on startup
chrome.runtime.onInstalled.addListener((details) => {
  try {
    debugLogger.log('Extension installed/updated', {
      version: chrome.runtime.getManifest().version,
      installTime: new Date().toISOString(),
      reason: details.reason
    });
    
    // Track installation or update with PostHog
    analytics.trackInstall(details.reason);
    
    chrome.storage.sync.get('tabSorterCategories', (result) => {
      if (chrome.runtime.lastError) {
        debugLogger.error('Error loading categories:', chrome.runtime.lastError);
        return;
      }
      
      if (result && result.tabSorterCategories && Array.isArray(result.tabSorterCategories)) {
        PREDEFINED_CATEGORIES = result.tabSorterCategories;
        debugLogger.log('Loaded custom categories', { 
          count: PREDEFINED_CATEGORIES.length,
          categories: PREDEFINED_CATEGORIES
        });
      } else {
        debugLogger.log('Using default categories', { 
          count: PREDEFINED_CATEGORIES.length,
          categories: PREDEFINED_CATEGORIES
        });
      }
    });
    
    // Initialize default settings if not already set
    chrome.storage.sync.get(['notificationsEnabled', 'analysisTimeout', 'tabGeniusDebugMode'], (settings) => {
      const updates = {};
      let hasUpdates = false;
      
      if (settings.notificationsEnabled === undefined) {
        updates.notificationsEnabled = true;
        hasUpdates = true;
      }
      
      if (settings.analysisTimeout === undefined) {
        updates.analysisTimeout = 15;
        hasUpdates = true;
      }
      
      if (settings.tabGeniusDebugMode === undefined) {
        updates.tabGeniusDebugMode = false;
        hasUpdates = true;
      }
      
      if (hasUpdates) {
        chrome.storage.sync.set(updates, () => {
          debugLogger.log('Initialized default settings', updates);
        });
      }
    });
  } catch (error) {
    debugLogger.error('Error during extension initialization:', error);
    analytics.trackError('initialization', error.message);
  }
});

// Function to simulate AI categorization when real AI is not available
function simulateAICategory(content) {
  // Simple keyword-based categorization
  const contentLower = content.toLowerCase();
  
  const categories = [
    { keywords: ['news', 'article', 'politics', 'world'], category: 'News' },
    { keywords: ['shop', 'price', 'buy', 'cart', 'product'], category: 'Shopping' },
    { keywords: ['video', 'watch', 'stream', 'movie', 'episode'], category: 'Media' },
    { keywords: ['learn', 'course', 'education', 'tutorial'], category: 'Education' },
    { keywords: ['social', 'profile', 'friend', 'network'], category: 'Social' },
    { keywords: ['tech', 'software', 'programming', 'code', 'developer'], category: 'Tech' },
    { keywords: ['game', 'play', 'gaming'], category: 'Games' },
    { keywords: ['finance', 'money', 'bank', 'invest'], category: 'Finance' },
    { keywords: ['travel', 'hotel', 'flight', 'vacation'], category: 'Travel' },
    { keywords: ['food', 'recipe', 'restaurant', 'cook'], category: 'Food' },
    { keywords: ['health', 'medical', 'fitness', 'doctor'], category: 'Health' },
    { keywords: ['sports', 'team', 'player', 'match', 'league'], category: 'Sports' },
    { keywords: ['leadership', 'management', 'leader', 'team lead'], category: 'Leadership' },
    { keywords: ['learning', 'study', 'training', 'skill'], category: 'Learning' },
    { keywords: ['research', 'study', 'paper', 'journal', 'analysis'], category: 'Research' },
    { keywords: ['career', 'job', 'resume', 'interview', 'employment'], category: 'Career' },
    { keywords: ['network', 'connect', 'professional', 'linkedin'], category: 'Networking' },
    { keywords: ['analytics', 'data', 'metrics', 'dashboard', 'report'], category: 'Analytics' },
    { keywords: ['marketing', 'campaign', 'promotion', 'advertise'], category: 'Marketing' },
    { keywords: ['design', 'ui', 'ux', 'graphic', 'creative'], category: 'Design' },
    { keywords: ['document', 'manual', 'guide', 'instruction'], category: 'Documentation' },
    { keywords: ['communication', 'chat', 'message', 'email'], category: 'Communication' }
  ];
  
  for (const item of categories) {
    if (item.keywords.some(keyword => contentLower.includes(keyword))) {
      return item.category;
    }
  }
  
  // Default category if no keywords match
  return 'Misc';
}

// Add this function to the background.js file

/**
 * Show a notification with the extension's icon
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
function showNotification(title, message) {
  // Check if notifications are enabled
  chrome.storage.sync.get('notificationsEnabled', (result) => {
    // Only show notification if enabled (default is true)
    if (result.notificationsEnabled !== false) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: title,
        message: message
      });
    }
  });
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle different message actions
  switch (request.action) {
    case 'analyzeWithGemini':
      // First get the tab content
      getTabContent(request.tabId).then(async (content) => {
        try {
          const result = await analyzeWithGemini(
            content,
            request.categories,
            request.prompt
          );
          sendResponse({ category: result });
        } catch (error) {
          debugLogger.error('Gemini analysis error:', error);
          showNotification('Tab Analysis Error', error.message || 'Failed to analyze tab');
          // Use simulate fallback for any error
          const fallbackCategory = simulateAICategory(content.substring(0, 750));
          sendResponse({ error: error.message, category: fallbackCategory });
        }
      }).catch(error => {
        debugLogger.error('Error getting tab content:', error);
        // Use simulate fallback for any error
        const fallbackCategory = simulateAICategory(`Title: ${request.tabId}`);
        sendResponse({ error: 'Failed to get tab content', category: fallbackCategory });
      });
      return true; // Indicates async response

    case 'analyzeWithOllama':
      analyzeWithOllama(request.url, request.model, request.prompt, request.tabId)
        .then(sendResponse)
        .catch(error => {
          showNotification('Tab Analysis Error', error.message || 'Failed to analyze tab');
          // Use simulate fallback for any error
          getTabContent(request.tabId).then(content => {
            const fallbackCategory = simulateAICategory(content.substring(0, 750));
            sendResponse({ error: error.message, category: fallbackCategory });
          }).catch(contentError => {
            const fallbackCategory = simulateAICategory(`Title: ${request.tabId}`);
            sendResponse({ error: error.message, category: fallbackCategory });
          });
        });
      return true; // Indicates async response
      
    case 'simulateFallback':
      // Direct request to use the simulate fallback
      try {
        const content = `Title: ${request.title || ''}\nURL: ${request.url || ''}`;
        const category = simulateAICategory(content);
        sendResponse({ category: category });
      } catch (error) {
        debugLogger.error('Error in simulate fallback:', error);
        sendResponse({ category: 'Uncategorized', error: error.message });
      }
      return true;

    case 'updateCategories':
      // Update the predefined categories with user-defined ones
      try {
        if (Array.isArray(request.categories)) {
          PREDEFINED_CATEGORIES = request.categories;
          
          // Only show notification if explicitly requested
          if (request.showNotification !== false) {
            showNotification('Tab Genius', 'Categories updated successfully');
          }
          
          sendResponse({ success: true });
        } else {
          // Only show notification if explicitly requested
          if (request.showNotification !== false) {
            showNotification('Tab Genius', 'Invalid categories format');
          }
          
          sendResponse({ error: 'Invalid categories format' });
        }
      } catch (error) {
        console.error('Error updating categories:', error);
        
        // Only show notification if explicitly requested
        if (request.showNotification !== false) {
          showNotification('Tab Genius', 'Failed to update categories');
        }
        
        sendResponse({ error: 'Failed to update categories' });
      }
      return true;

    case 'showNotification':
      // Allow other parts of the extension to show notifications
      showNotification(request.title || 'Tab Genius', request.message);
      sendResponse({ success: true });
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
      return false;
  }
});

/**
 * Analyze tab content with Google's Gemini API
 * @param {string} content - Tab content to analyze
 * @param {Array<string>} availableCategories - Available categories to choose from
 * @param {string} customPrompt - Custom prompt for the AI model
 * @returns {Promise<string>} - Category name
 */
async function analyzeWithGemini(content, availableCategories, customPrompt) {
  let session = null;
  try {
    debugLogger.log('Analyzing content with Gemini', {
      contentLength: content.length,
      categoriesAvailable: availableCategories ? availableCategories.length : 0,
      customPrompt: customPrompt
    });
    
    // Trim content to 750 characters for efficiency
    const trimmedContent = content.substring(0, 750);
    
    // Check if content is too short or indicates an error
    if (trimmedContent.length < 10 || trimmedContent.includes('Unable to access tab content')) {
      debugLogger.warn("Insufficient content for analysis, using tab title");
      return simulateAICategory(trimmedContent);
    }
    
    // Check if Chrome AI API is available
    if (typeof ai === 'undefined' || !ai.languageModel) {
      debugLogger.error('Chrome AI API not available');
      return simulateAICategory(trimmedContent);
    }
    
    // Prepare prompt with content and predefined categories
    let categoriesText = "various categories";
    if (Array.isArray(availableCategories) && availableCategories.length > 0) {
      categoriesText = availableCategories.join(', ');
    }
    
    const fullPrompt = `${customPrompt}\n\nContent: ${trimmedContent}\n\nChoose from these categories if possible: ${categoriesText}. Respond with only 1-2 words in English.`;
    
    debugLogger.log('Gemini prompt prepared', {
      promptLength: fullPrompt.length,
      availableCategories: availableCategories,
    });
    
    try {
      // Check capabilities
      const capabilities = await ai.languageModel.capabilities();
      debugLogger.log("Gemini capabilities:", capabilities);
      
      if (capabilities.available === 'no') {
        debugLogger.warn("Gemini model not available, falling back to simulation");
        return simulateAICategory(trimmedContent);
      }
      
      // Create a session with a timeout
      const sessionPromise = ai.languageModel.create({
        systemPrompt: 'You are a helpful assistant that categorizes web pages. Respond with a single category name (1-2 words maximum) that best describes the content. Capitalize the first letter of each word in the category. Always respond in English only.'
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session creation timeout')), 3000);
      });
      
      session = await Promise.race([sessionPromise, timeoutPromise]);
      
      debugLogger.log("Gemini session created successfully");
      
      // Get response from Gemini with timeout
      const promptPromise = session.prompt(fullPrompt);
      const promptTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Prompt response timeout')), 5000);
      });
      
      const response = await Promise.race([promptPromise, promptTimeoutPromise]);
      
      debugLogger.log("Gemini response received:", {
        rawResponse: response
      });
      
      // Clean up and format the response
      return formatCategory(response, availableCategories);
      
    } catch (error) {
      debugLogger.error("Error using Gemini API:", error);
      return simulateAICategory(trimmedContent);
    }
  } catch (error) {
    debugLogger.error('Error analyzing with Gemini:', error);
    // Use simulate fallback for any error
    return simulateAICategory(content.substring(0, 750));
  } finally {
    // Ensure session cleanup
    if (session) {
      try {
        await session.destroy();
      } catch (error) {
        debugLogger.warn('Error destroying Gemini session:', error);
      }
    }
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
    
    // Trim content to 750 characters for efficiency
    const trimmedContent = content.substring(0, 750);
    
    // Prepare prompt with content and predefined categories
    const fullPrompt = `${prompt}\n\nContent: ${trimmedContent}\n\nChoose from these categories if possible: ${PREDEFINED_CATEGORIES.join(', ')}. Respond with only 1-2 words.`;
    
    console.log("Ollama prompt:", fullPrompt);
    
    try {
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
        console.error(`Ollama API error: ${response.status}`);
        // Fall back to simulated response if Ollama is not available
        return { category: simulateAICategory(trimmedContent) };
      }
      
      const data = await response.json();
      // Clean up and format the response
      const category = formatCategory(data.response);
      
      return { category };
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      // Fall back to simulated response if Ollama is not available
      return { category: simulateAICategory(trimmedContent) };
    }
  } catch (error) {
    console.error('Error analyzing with Ollama:', error);
    throw new Error('Failed to analyze with Ollama');
  }
}

/**
 * Format category name: capitalize, limit to 1-2 words, and match with predefined categories if possible
 * @param {string} categoryText - Raw category text from AI
 * @param {Array<string>} availableCategories - Available categories to choose from
 * @returns {string} - Formatted category name
 */
function formatCategory(categoryText, availableCategories) {
  // Remove quotes, extra spaces, and limit to 1-2 words
  const cleanedText = categoryText.replace(/["']/g, '').trim();
  const words = cleanedText.split(/\s+/).slice(0, 2);
  
  // Capitalize each word
  const formattedCategory = words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  debugLogger.log('Formatting category', {
    raw: categoryText,
    cleaned: cleanedText,
    formatted: formattedCategory
  });
  
  // Try to match with predefined categories
  const matchedCategory = availableCategories.find(category => 
    category.toLowerCase() === formattedCategory.toLowerCase()
  );
  
  if (matchedCategory) {
    debugLogger.log('Matched with predefined category', {
      formatted: formattedCategory,
      matched: matchedCategory
    });
    return matchedCategory;
  }
  
  return formattedCategory;
}

/**
 * Get content from a tab
 * @param {number} tabId - ID of the tab
 * @returns {Promise<string>} - Tab content
 */
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
      return `Title: ${tab.title || 'Chrome Page'}\nURL: ${tab.url || 'Internal Chrome URL'}`;
    }
    
    // For about: URLs, file: URLs, and other special protocols
    if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
      return `Title: ${tab.title || 'Special Page'}\nURL: ${tab.url || 'Special URL'}`;
    }
    
    // Check if the tab is in a state where we can execute scripts
    try {
      // First check if the tab is in a ready state by getting its status
      const tabInfo = await chrome.tabs.get(tabId);
      
      // If the tab is loading or has an error, use basic info
      if (tabInfo.status !== 'complete' || tabInfo.url.includes('chrome-error://')) {
        return `Title: ${tab.title || 'Loading Page'}\nURL: ${tab.url || 'Loading URL'}`;
      }
      
      // Execute content script to extract page content
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: extractPageContent,
        // Make sure we're injecting into the main world to access page content
        world: "MAIN"
      });
      
      // Return extracted content
      return results[0].result;
    } catch (scriptError) {
      console.error('Script execution error:', scriptError);
      
      // Check if this is an error page or permission issue
      if (scriptError.message && (
          scriptError.message.includes('Frame with ID') || 
          scriptError.message.includes('error page') ||
          scriptError.message.includes('Cannot access contents'))) {
        
        // For error pages, just return the tab title and URL
        return `Title: ${tab.title || 'Error Page'}\nURL: ${tab.url || 'Error URL'}`;
      }
      
      // For other script errors, return basic tab info
      return `Title: ${tab.title || 'Unknown'}\nURL: ${tab.url || 'Unknown'}`;
    }
  } catch (error) {
    console.error('Error getting tab content:', error);
    // Return minimal information to allow processing to continue
    return 'Unable to access tab content';
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
    
    // If no specific content areas found, get body text
    let bodyText = '';
    if (!mainContent) {
      bodyText = document.body?.innerText || '';
      // Limit body text to avoid excessive content
      bodyText = bodyText.substring(0, 500);
    }
    
    // Combine all content
    const combinedContent = [title, metaDescription, headings, mainContent, bodyText]
      .filter(Boolean)
      .join(' ')
      .substring(0, 1000); // Limit content length
    
    return combinedContent || 'No content available';
  } catch (error) {
    // Return a safe value that won't cause further errors
    return 'Error extracting content: ' + (error.message || 'Unknown error');
  }
}
