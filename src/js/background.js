/**
 * Background script for Tab Sorter extension
 * Handles API calls and tab content extraction
 */

// Predefined categories for consistent grouping
let PREDEFINED_CATEGORIES = [
  'News', 'Shopping', 'Media', 'Education', 'Social', 
  'Tech', 'Games', 'Finance', 'Travel', 'Food',
  'Health', 'Sports', 'Entertainment', 'Business', 'Reference',
  'Productivity', 'Development', 'Science', 'Arts', 'Learning',
  'Leadership', 'Research', 'Career', 'Networking', 'Analytics',
  'Marketing', 'Design', 'Documentation', 'Communication', 'Misc'
];

// Load user-defined categories from storage on startup
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.storage.sync.get('tabSorterCategories', (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading categories:', chrome.runtime.lastError);
        return;
      }
      
      if (result && result.tabSorterCategories && Array.isArray(result.tabSorterCategories)) {
        PREDEFINED_CATEGORIES = result.tabSorterCategories;
      }
    });
  } catch (error) {
    console.error('Error accessing storage:', error);
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
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: title,
    message: message
  });
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle different message actions
  switch (request.action) {
    case 'analyzeWithGemini':
      analyzeWithGemini(request.prompt, request.tabId)
        .then(sendResponse)
        .catch(error => {
          showNotification('Tab Analysis Error', error.message || 'Failed to analyze tab');
          sendResponse({ error: error.message });
        });
      return true; // Indicates async response

    case 'analyzeWithOllama':
      analyzeWithOllama(request.url, request.model, request.prompt, request.tabId)
        .then(sendResponse)
        .catch(error => {
          showNotification('Tab Analysis Error', error.message || 'Failed to analyze tab');
          sendResponse({ error: error.message });
        });
      return true; // Indicates async response
      
    case 'updateCategories':
      // Update the predefined categories with user-defined ones
      try {
        if (Array.isArray(request.categories)) {
          PREDEFINED_CATEGORIES = request.categories;
          showNotification('Tab Genius', 'Categories updated successfully');
          sendResponse({ success: true });
        } else {
          showNotification('Tab Genius', 'Invalid categories format');
          sendResponse({ error: 'Invalid categories format' });
        }
      } catch (error) {
        console.error('Error updating categories:', error);
        showNotification('Tab Genius', 'Failed to update categories');
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
 * Analyze tab content with Chrome's Gemini API
 * @param {string} prompt - Prompt for the AI model
 * @param {number} tabId - ID of the tab to analyze
 * @returns {Promise<Object>} - Analysis result
 */
async function analyzeWithGemini(prompt, tabId) {
  try {
    // Get tab content
    const content = await getTabContent(tabId);
    
    // Trim content to 750 characters for efficiency
    const trimmedContent = content.substring(0, 750);
    
    // Check if content is too short or indicates an error
    if (trimmedContent.length < 10 || trimmedContent.includes('Unable to access tab content')) {
      console.warn("Insufficient content for analysis, using tab title");
      
      // Get tab title as fallback
      const tab = await chrome.tabs.get(tabId);
      const titleContent = `Title: ${tab.title || 'Unknown'}\nURL: ${tab.url || 'Unknown'}`;
      
      // Use simulated categorization with title
      return { category: simulateAICategory(titleContent) };
    }
    
    // Prepare prompt with content and predefined categories
    const fullPrompt = `${prompt}\n\nContent: ${trimmedContent}\n\nChoose from these categories if possible: ${PREDEFINED_CATEGORIES.join(', ')}. Respond with only 1-2 words in English.`;
    
    // Check if Chrome's Prompt API is available
    if (typeof ai !== 'undefined' && ai.languageModel) {
      try {
        // Check capabilities
        const capabilities = await ai.languageModel.capabilities();
        console.log("Gemini capabilities:", capabilities);
        
        if (capabilities.available !== 'no') {
          try {
            // Create a session with a timeout
            const sessionPromise = ai.languageModel.create({
              systemPrompt: 'You are a helpful assistant that categorizes web pages. Respond with a single category name (1-2 words maximum) that best describes the content. Capitalize the first letter of each word in the category. Always respond in English only.'
            });
            
            // Add timeout to session creation
            const session = await Promise.race([
              sessionPromise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Session creation timeout')), 3000)
              )
            ]);
            
            // Get response from Gemini with timeout
            const responsePromise = session.prompt(fullPrompt);
            const response = await Promise.race([
              responsePromise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Prompt response timeout')), 5000)
              )
            ]);
            
            console.log("Gemini response:", response);
            
            // Clean up and format the response
            const category = formatCategory(response);
            
            // Destroy the session to free resources
            try {
              session.destroy();
            } catch (destroyError) {
              console.warn("Error destroying Gemini session:", destroyError);
            }
            
            return { category };
          } catch (promptError) {
            console.warn("Error with Gemini prompt, falling back to simulation:", promptError);
            return { category: simulateAICategory(trimmedContent) };
          }
        } else {
          console.warn("Gemini model not available, falling back to simulation");
          return { category: simulateAICategory(trimmedContent) };
        }
      } catch (apiError) {
        console.error("Error using Chrome's Prompt API:", apiError);
        return { category: simulateAICategory(trimmedContent) };
      }
    } else {
      console.warn("Chrome's Prompt API not available, falling back to simulation");
      return { category: simulateAICategory(trimmedContent) };
    }
  } catch (error) {
    console.error('Error analyzing with Gemini:', error);
    return { category: 'Misc' };
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
 * @returns {string} - Formatted category name
 */
function formatCategory(categoryText) {
  // Remove quotes, extra spaces, and limit to 1-2 words
  const cleanedText = categoryText.replace(/["']/g, '').trim();
  const words = cleanedText.split(/\s+/).slice(0, 2);
  
  // Capitalize each word
  const formattedCategory = words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  // Try to match with predefined categories
  const matchedCategory = PREDEFINED_CATEGORIES.find(category => 
    category.toLowerCase() === formattedCategory.toLowerCase()
  );
  
  return matchedCategory || formattedCategory;
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
