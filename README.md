# Tab Genius: AI-Powered Tab Organization

A smart Chrome extension that helps you organize your browser tabs efficiently using artificial intelligence.

## Overview

Tab Genius uses artificial intelligence to automatically analyze and organize your open tabs into meaningful groups, helping you stay focused and productive. Say goodbye to tab overload and hello to a clean, organized browsing experience.

## Key Features

### AI-Powered Tab Analysis
Tab Genius intelligently analyzes the content of your tabs and categorizes them based on what they contain - not just domain names. Whether you're researching, shopping, or working across multiple sites, Tab Genius understands the context and groups similar content together.

### Smart Categorization
Tabs are automatically sorted into intuitive categories like:
- News & Articles
- Shopping
- Education
- Development
- Analytics
- Documentation
- And many more!

### Flexible Configuration
- Customize categories to match your workflow
- Adjust analysis timeout settings
- Choose between Google's Gemini AI or local Ollama models for privacy
- Create your own custom prompts for categorization

### One-Click Organization
Transform tab chaos into order with a single click. Tab Genius creates color-coded groups that make it easy to find what you need when you need it.

### Privacy-Focused
- All content analysis happens locally in your browser
- No data is sent to external servers (when using local models)
- No account or login required

### Performance Optimized
- Lightweight and efficient processing
- Works with large numbers of tabs
- Fallback mechanisms ensure reliability even when AI analysis is limited

## Installation

### Chrome Web Store
1. Visit the [Tab Genius page on the Chrome Web Store](https://chrome.google.com/webstore/detail/tab-genius/your-extension-id)
2. Click "Add to Chrome"
3. Confirm the installation when prompted

### Development Installation
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Tab Genius extension should now be installed and visible in your toolbar

## Usage

1. Click on the Tab Genius icon in your Chrome toolbar
2. Choose from the available options:
   - **Sort by Title**: Sorts all tabs alphabetically by title
   - **Sort by URL**: Sorts all tabs alphabetically by URL
   - **Organize by Content**: Groups tabs based on their content using AI
   - **Ungroup All**: Removes all tab groupings
   - **Undo**: Restores tabs to their previous arrangement

### Using Chrome's Built-in Gemini
To use Chrome's built-in Gemini Nano model:
1. Make sure you're using Chrome version 131 or later
2. The extension will automatically use Chrome's built-in Gemini if available
3. Select "Chrome Gemini" from the AI Model dropdown

### Using Ollama
To use Ollama for tab organization:
1. Make sure you have Ollama installed and running locally
2. Select "Ollama" from the AI Model dropdown
3. Configure the Ollama URL (default: http://localhost:11434)
4. Specify the model name (default: llama3)
5. Click "Organize by Content"

## Perfect For
- Researchers juggling multiple sources
- Developers with documentation spread across many tabs
- Students working on assignments
- Professionals managing multiple projects
- Anyone who regularly has more than 10 tabs open

## Project Structure

```
tab-genius/
├── icons/                  # Extension icons
├── src/
│   ├── css/                # Stylesheets
│   │   └── popup.css       # Popup styles
│   ├── html/               # HTML files
│   │   └── popup.html      # Popup interface
│   └── js/                 # JavaScript files
│       ├── background.js   # Background script
│       ├── popup.js        # Popup script
│       └── modules/        # Modular components
│           ├── tabSorter.js        # Tab sorting functionality
│           ├── tabOrganizer.js     # Tab organization functionality
│           ├── tabStateManager.js  # Tab state management for undo
│           ├── uiManager.js        # UI management
│           ├── debugLogger.js      # Logging functionality
│           ├── categoryManager.js  # Category management
│           └── aiModels/           # AI model implementations
│               ├── aiModelFactory.js  # Factory for creating AI models
│               ├── geminiModel.js     # Chrome Gemini implementation
│               └── ollamaModel.js     # Ollama implementation
└── manifest.json           # Extension manifest
```

## Limitations

- The extension cannot access or organize Chrome's internal pages (chrome:// URLs)
- Tab organization depends on the quality of the AI model's categorization
- Performance may vary based on the number of tabs and the chosen AI model

## License

MIT License