# Tab Genius Chrome Extension

A smart Chrome extension that helps you sort and organize your browser tabs efficiently using AI.

## Features

### Tab Sorting
- Sort tabs alphabetically by title
- Sort tabs alphabetically by URL
- Pinned tabs are preserved and not sorted
- Undo functionality to restore previous tab arrangement

### Tab Organization
- Organize tabs into groups based on content using AI
- Support for multiple AI models:
  - Chrome's built-in Gemini Nano model (using Chrome's Prompt API)
  - Ollama (local AI model)
- Consistent categorization with capitalized 1-2 word group names
- Undo functionality to restore previous tab arrangement

## Installation

### Development Installation
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Tab Genius extension should now be installed and visible in your toolbar

### Using Chrome's Built-in Gemini
To use Chrome's built-in Gemini Nano model:
1. Make sure you're using Chrome version 131 or later
2. The extension will automatically use Chrome's built-in Gemini if available
3. Select "Chrome Gemini" from the AI Model dropdown

## Usage

1. Click on the Tab Genius icon in your Chrome toolbar
2. Choose from the available options:
   - **Sort by Title**: Sorts all tabs alphabetically by title
   - **Sort by URL**: Sorts all tabs alphabetically by URL
   - **Organize by Content**: Groups tabs based on their content using AI
   - **Ungroup All**: Removes all tab groupings
   - **Undo**: Restores tabs to their previous arrangement

### Using Ollama

To use Ollama for tab organization:
1. Make sure you have Ollama installed and running locally
2. Select "Ollama" from the AI Model dropdown
3. Configure the Ollama URL (default: http://localhost:11434)
4. Specify the model name (default: llama3.2)
5. Click "Organize by Content"

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