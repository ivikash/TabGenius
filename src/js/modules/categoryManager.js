/**
 * Manages the categories for tab organization
 */
export class CategoryManager {
  constructor() {
    this.categories = [];
    this.defaultCategories = [
      'News', 'Shopping', 'Media', 'Education', 'Social', 
      'Tech', 'Games', 'Finance', 'Travel', 'Food',
      'Health', 'Sports', 'Entertainment', 'Business', 'Reference',
      'Productivity', 'Development', 'Science', 'Arts', 'Learning',
      'Leadership', 'Research', 'Career', 'Networking', 'Analytics',
      'Marketing', 'Design', 'Documentation', 'Communication', 'Misc'
    ];
  }

  /**
   * Initialize the category manager
   * @returns {Promise<void>}
   */
  async init() {
    try {
      await this.loadCategories();
      this.renderCategories();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing CategoryManager:', error);
      // Use default categories if initialization fails
      this.categories = [...this.defaultCategories];
      this.renderCategories();
      this.setupEventListeners();
    }
  }

  /**
   * Load categories from storage
   * @returns {Promise<void>}
   */
  async loadCategories() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get('tabSorterCategories', (result) => {
          if (chrome.runtime.lastError) {
            console.error('Error loading categories:', chrome.runtime.lastError);
            // Use default categories if there's an error
            this.categories = [...this.defaultCategories];
            resolve();
            return;
          }
          
          if (result && result.tabSorterCategories && Array.isArray(result.tabSorterCategories)) {
            this.categories = result.tabSorterCategories;
          } else {
            // Use default categories if none are saved
            this.categories = [...this.defaultCategories];
          }
          resolve();
        });
      } catch (error) {
        console.error('Error accessing storage:', error);
        // Use default categories if there's an exception
        this.categories = [...this.defaultCategories];
        resolve();
      }
    });
  }

  /**
   * Save categories to storage
   * @returns {Promise<void>}
   */
  async saveCategories() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.set({ 'tabSorterCategories': this.categories }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error saving categories:', chrome.runtime.lastError);
            resolve(false);
            return;
          }
          
          // Also update the background script with the new categories
          try {
            chrome.runtime.sendMessage({
              action: 'updateCategories',
              categories: this.categories
            });
          } catch (msgError) {
            console.warn('Could not update background script:', msgError);
          }
          
          resolve(true);
        });
      } catch (error) {
        console.error('Error accessing storage:', error);
        resolve(false);
      }
    });
  }

  /**
   * Reset categories to default
   * @returns {Promise<void>}
   */
  async resetCategories() {
    this.categories = [...this.defaultCategories];
    await this.saveCategories();
    this.renderCategories();
  }

  /**
   * Add a new category
   * @param {string} category - Category name to add
   * @returns {boolean} - Whether the category was added
   */
  addCategory(category) {
    // Format the category (capitalize first letter of each word)
    const formattedCategory = category.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Check if category already exists
    if (this.categories.includes(formattedCategory)) {
      return false;
    }
    
    // Add the category
    this.categories.push(formattedCategory);
    return true;
  }

  /**
   * Remove a category
   * @param {string} category - Category name to remove
   */
  removeCategory(category) {
    const index = this.categories.indexOf(category);
    if (index !== -1) {
      this.categories.splice(index, 1);
    }
  }

  /**
   * Render categories as tags in the UI
   */
  renderCategories() {
    try {
      const categoryTagsContainer = document.getElementById('categoryTags');
      if (!categoryTagsContainer) {
        console.error('Category tags container not found');
        return;
      }
      
      categoryTagsContainer.innerHTML = '';
      
      this.categories.forEach(category => {
        const tagElement = document.createElement('div');
        tagElement.className = 'category-tag';
        tagElement.dataset.category = category;
        
        const tagText = document.createElement('span');
        tagText.textContent = category;
        tagElement.appendChild(tagText);
        
        const removeIcon = document.createElement('i');
        removeIcon.className = 'material-icons-round';
        removeIcon.textContent = 'close';
        removeIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeCategory(category);
          tagElement.remove();
        });
        
        tagElement.appendChild(removeIcon);
        categoryTagsContainer.appendChild(tagElement);
      });
    } catch (error) {
      console.error('Error rendering categories:', error);
    }
  }

  /**
   * Setup event listeners for category management
   */
  setupEventListeners() {
    try {
      // We don't need to set up the toggle button here as it's handled by UIManager
      // The toggle button event listener in UIManager will show/hide the category manager section
      
      // Add new category
      const addButton = document.getElementById('addCategoryBtn');
      if (addButton) {
        addButton.addEventListener('click', () => {
          const newCategoryInput = document.getElementById('newCategoryInput');
          const category = newCategoryInput.value.trim();
          
          if (category) {
            if (this.addCategory(category)) {
              this.renderCategories();
              newCategoryInput.value = '';
            } else {
              // Show error if category already exists
              alert('This category already exists!');
            }
          }
        });
      }
      
      // Add category on Enter key
      const newCategoryInput = document.getElementById('newCategoryInput');
      if (newCategoryInput) {
        newCategoryInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            document.getElementById('addCategoryBtn')?.click();
          }
        });
      }
      
      // Save categories
      const saveButton = document.getElementById('saveCategoriesBtn');
      if (saveButton) {
        saveButton.addEventListener('click', async () => {
          const success = await this.saveCategories();
          if (success) {
            alert('Categories saved successfully!');
          } else {
            alert('Failed to save categories. Please try again.');
          }
        });
      }
      
      // Reset categories
      const resetButton = document.getElementById('resetCategoriesBtn');
      if (resetButton) {
        resetButton.addEventListener('click', async () => {
          if (confirm('Are you sure you want to reset to default categories?')) {
            await this.resetCategories();
          }
        });
      }
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }

  /**
   * Get all categories
   * @returns {Array<string>} - Array of category names
   */
  getCategories() {
    return [...this.categories];
  }
}