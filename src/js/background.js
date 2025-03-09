/**
 * Background script for Tab Sorter extension
 * Handles API calls and tab content extraction
 */

// Predefined categories for consistent grouping
const PREDEFINED_CATEGORIES = [
  'News', 'Shopping', 'Media', 'Education', 'Social', 
  'Tech', 'Games', 'Finance', 'Travel', 'Food',
  'Health', 'Sports', 'Entertainment', 'Business', 'Reference',
  'Productivity', 'Development', 'Science', 'Arts', 'Misc'
];

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
    { keywords: ['sports', 'team', 'player', 'match', 'league'], category: 'Sports' }
  ];
  
  for (const item of categories) {
    if (item.keywords.some(keyword => contentLower.includes(keyword))) {
      return item.category;
    }
  }
  
  // Default category if no keywords match
  return 'Misc';
}

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
    
    // Trim content to 750 characters for efficiency
    const trimmedContent = content.substring(0, 750);
    
    // Prepare prompt with content and predefined categories
    const fullPrompt = `${prompt}\n\nContent: ${trimmedContent}\n\nChoose from these categories if possible: ${PREDEFINED_CATEGORIES.join(', ')}. Respond with only 1-2 words.`;
    
    // Check if Chrome's Prompt API is available
    if (typeof ai !== 'undefined' && ai.languageModel) {
      try {
        // Check capabilities
        const capabilities = await ai.languageModel.capabilities();
        console.log("Gemini capabilities:", capabilities);
        
        if (capabilities.available !== 'no') {
          // Create a session
          const session = await ai.languageModel.create({
            systemPrompt: 'You are a helpful assistant that categorizes web pages. Respond with a single category name (1-2 words maximum) that best describes the content. Capitalize the first letter of each word in the category.'
          });
          
          // Get response from Gemini
          const response = await session.prompt(fullPrompt);
          console.log("Gemini response:", response);
          
          // Clean up and format the response
          const category = formatCategory(response);
          
          // Destroy the session to free resources
          session.destroy();
          
          return { category };
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
async function getTabContent(tabId) {
  try {
    // Check if tab exists and is accessible
    const tab = await chrome.tabs.get(tabId);
    
    // Skip chrome:// and chrome-extension:// URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot access Chrome internal pages');
    }
    
    // Execute content script to extract page content
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: extractPageContent
      });
      
      // Return extracted content
      return results[0].result;
    } catch (scriptError) {
      console.error('Script execution error:', scriptError);
      // If script execution fails, return basic tab info
      return `Title: ${tab.title}\nURL: ${tab.url}`;
    }
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
    console.error('Error extracting page content:', error);
    return 'Error extracting content';
  }
}
