# Tab Sorter Chrome Extension

A Chrome extension that helps you sort and organize your browser tabs efficiently.

## Features

### Tab Sorting
- Sort tabs alphabetically by title
- Sort tabs alphabetically by URL
- Pinned tabs are preserved and not sorted

### Tab Organization
- Organize tabs into groups based on content using AI
- Support for multiple AI models:
  - Chrome's built-in Gemini model
  - Ollama (local AI model)

## Installation

### Development Installation
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Tab Sorter extension should now be installed and visible in your toolbar

## Usage

1. Click on the Tab Sorter icon in your Chrome toolbar
2. Choose from the available options:
   - **Sort by Title**: Sorts all tabs alphabetically by title
   - **Sort by URL**: Sorts all tabs alphabetically by URL
   - **Organize by Content**: Groups tabs based on their content using AI

### Using Ollama

To use Ollama for tab organization:
1. Make sure you have Ollama installed and running locally
2. Select "Ollama" from the AI Model dropdown
3. Configure the Ollama URL (default: http://localhost:11434)
4. Specify the model name (default: llama3.2)
5. Click "Organize by Content"

## Project Structure

```
tab-sorter/
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
