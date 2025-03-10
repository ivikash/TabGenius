/**
 * Manages the categories for tab organization
 */
import debugLogger from './debugLogger.js';

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
      debugLogger.log('CategoryManager initialized', { 
        categoriesCount: this.categories.length,
        usingDefaults: JSON.stringify(this.categories) === JSON.stringify(this.defaultCategories)
      });
    } catch (error) {
      debugLogger.error('Error initializing CategoryManager:', error);
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
            debugLogger.error('Error loading categories:', chrome.runtime.lastError);
            // Use default categories if there's an error
            this.categories = [...this.defaultCategories];
            resolve();
            return;
          }
          
          if (result && result.tabSorterCategories && Array.isArray(result.tabSorterCategories)) {
            this.categories = result.tabSorterCategories;
            debugLogger.log('Loaded custom categories', { 
              count: this.categories.length,
              categories: this.categories
            });
          } else {
            // Use default categories if none are saved
            this.categories = [...this.defaultCategories];
            debugLogger.log('Using default categories', { 
              count: this.categories.length
            });
          }
          resolve();
        });
      } catch (error) {
        debugLogger.error('Error accessing storage:', error);
        // Use default categories if there's an exception
        this.categories = [...this.defaultCategories];
        resolve();
      }
    });
  }

  /**
   * Save categories to storage
   * @returns {Promise<boolean>} - Whether the save was successful
   */
  async saveCategories() {
    return new Promise((resolve) => {
      try {
        debugLogger.log('Saving categories', { count: this.categories.length });
        chrome.storage.sync.set({ 'tabSorterCategories': this.categories }, () => {
          if (chrome.runtime.lastError) {
            debugLogger.error('Error saving categories:', chrome.runtime.lastError);
            resolve(false);
            return;
          }
          
          debugLogger.log('Categories saved successfully');
          
          // Also update the background script with the new categories
          try {
            // Check if notifications are enabled
            chrome.storage.sync.get('notificationsEnabled', (result) => {
              const notificationsEnabled = result.notificationsEnabled !== false;
              
              chrome.runtime.sendMessage({
                action: 'updateCategories',
                categories: this.categories,
                showNotification: notificationsEnabled
              });
            });
          } catch (msgError) {
            debugLogger.warn('Could not update background script:', msgError);
          }
          
          resolve(true);
        });
      } catch (error) {
        debugLogger.error('Error accessing storage:', error);
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
   * Add a new category or multiple comma-separated categories
   * @param {string} categoryInput - Category name(s) to add
   * @returns {boolean} - Whether at least one category was added
   */
  addCategory(categoryInput) {
    // Split by comma to support multiple categories at once
    const categoryNames = categoryInput.split(',').map(cat => cat.trim()).filter(cat => cat);
    
    if (categoryNames.length === 0) {
      return false;
    }
    
    let atLeastOneAdded = false;
    
    for (const category of categoryNames) {
      // Format the category (capitalize first letter of each word)
      const formattedCategory = category.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      // Check if category already exists
      if (!this.categories.includes(formattedCategory)) {
        // Add the category
        this.categories.push(formattedCategory);
        atLeastOneAdded = true;
      }
    }
    
    // Auto-save categories when added
    if (atLeastOneAdded) {
      this.saveCategories().then(success => {
        if (success) {
          // Show status message
          const statusElement = document.getElementById('status');
          if (statusElement) {
            statusElement.textContent = 'Categories saved automatically';
            statusElement.className = 'status success';
            
            // Hide status after 3 seconds
            setTimeout(() => {
              statusElement.className = 'status';
            }, 3000);
          }
          
          // Show notification based on preference
          chrome.storage.sync.get('notificationsEnabled', (result) => {
            if (result.notificationsEnabled !== false) {
              chrome.runtime.sendMessage({
                action: 'showNotification',
                title: 'Success',
                message: 'Categories updated and saved!'
              });
            }
          });
        }
      });
    }
    
    return atLeastOneAdded;
  }

  /**
   * Remove a category
   * @param {string} category - Category name to remove
   */
  removeCategory(category) {
    const index = this.categories.indexOf(category);
    if (index !== -1) {
      this.categories.splice(index, 1);
      
      // Auto-save when a category is removed
      this.saveCategories().then(success => {
        if (success) {
          // Show status message
          const statusElement = document.getElementById('status');
          if (statusElement) {
            statusElement.textContent = 'Category removed and changes saved';
            statusElement.className = 'status success';
            
            // Hide status after 3 seconds
            setTimeout(() => {
              statusElement.className = 'status';
            }, 3000);
          }
          
          // Show notification based on preference
          chrome.storage.sync.get('notificationsEnabled', (result) => {
            if (result.notificationsEnabled !== false) {
              chrome.runtime.sendMessage({
                action: 'showNotification',
                title: 'Success',
                message: 'Category removed and changes saved!'
              });
            }
          });
        }
      });
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
        removeIcon.setAttribute('aria-hidden', 'true');
        
        const removeButton = document.createElement('button');
        removeButton.className = 'tag-remove-button';
        removeButton.setAttribute('aria-label', `Remove ${category} category`);
        removeButton.setAttribute('title', `Remove ${category}`);
        removeButton.appendChild(removeIcon);
        removeButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeCategory(category);
          tagElement.remove();
        });
        
        tagElement.appendChild(removeButton);
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
      // Add new category
      const addButton = document.getElementById('addCategoryBtn');
      if (addButton) {
        addButton.addEventListener('click', () => {
          const newCategoryInput = document.getElementById('newCategoryInput');
          const categoryInput = newCategoryInput.value.trim();
          
          if (categoryInput) {
            const added = this.addCategory(categoryInput);
            if (added) {
              this.renderCategories();
              newCategoryInput.value = '';
            } else {
              // Show error if no categories were added (all already exist)
              alert('All categories already exist!');
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
      
      // Reset categories
      const resetButton = document.getElementById('resetCategoriesBtn');
      if (resetButton) {
        resetButton.addEventListener('click', async () => {
          if (confirm('Are you sure you want to reset to default categories?')) {
            await this.resetCategories();
            
            // Get notification preference
            chrome.storage.sync.get('notificationsEnabled', (result) => {
              // Only show notification if enabled
              if (result.notificationsEnabled !== false) {
                chrome.runtime.sendMessage({
                  action: 'showNotification',
                  title: 'Success',
                  message: 'Categories reset to default!'
                });
              }
            });
          }
        });
      }
      
      // Delete all categories
      const deleteAllButton = document.getElementById('deleteAllCategoriesBtn');
      if (deleteAllButton) {
        deleteAllButton.addEventListener('click', async () => {
          if (confirm('Are you sure you want to delete ALL categories? This cannot be undone.')) {
            await this.deleteAllCategories();
            
            // Get notification preference
            chrome.storage.sync.get('notificationsEnabled', (result) => {
              // Only show notification if enabled
              if (result.notificationsEnabled !== false) {
                chrome.runtime.sendMessage({
                  action: 'showNotification',
                  title: 'Success',
                  message: 'All categories deleted!'
                });
              }
            });
          }
        });
      }
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }

  /**
   * Delete all categories
   * @returns {Promise<boolean>} - Success status
   */
  async deleteAllCategories() {
    try {
      this.categories = [];
      this.renderCategories();
      
      // Save empty categories to storage
      return await this.saveCategories();
    } catch (error) {
      debugLogger.error('Error deleting all categories:', error);
      return false;
    }
  }
}