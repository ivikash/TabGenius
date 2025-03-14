/**
 * Category Manager for Tab Genius extension
 * Handles category management and UI interactions
 */
import debugLogger from './debugLogger.js';
import analytics from './analytics.js';

export class CategoryManager {
  constructor() {
    this.defaultCategories = [
      'News', 'Shopping', 'Media', 'Education', 'Social', 
      'Tech', 'Games', 'Finance', 'Travel', 'Food',
      'Health', 'Sports', 'Entertainment', 'Business', 'Reference',
      'Productivity', 'Development', 'Science', 'Arts', 'Learning',
      'Leadership', 'Research', 'Career', 'Networking', 'Analytics',
      'Marketing', 'Design', 'Documentation', 'Communication', 'Misc'
    ];
    this.categories = [];
    this.categoryTagsContainer = null;
  }

  /**
   * Initialize the category manager
   */
  async init() {
    try {
      this.categoryTagsContainer = document.getElementById('categoryTags');
      
      // Load categories from storage
      await this.loadCategories();
      
      // Set up event listeners
      this.setupEventListeners();
      
      debugLogger.log('Category manager initialized with categories:', this.categories);
    } catch (error) {
      debugLogger.error('Error initializing category manager:', error);
      analytics.trackError('category_manager_init', error.message);
    }
  }

  /**
   * Load categories from storage
   */
  async loadCategories() {
    try {
      const result = await chrome.storage.sync.get('tabSorterCategories');
      
      if (result && result.tabSorterCategories && Array.isArray(result.tabSorterCategories)) {
        this.categories = result.tabSorterCategories;
      } else {
        this.categories = [...this.defaultCategories];
        // Save default categories to storage
        await chrome.storage.sync.set({ tabSorterCategories: this.categories });
      }
      
      this.renderCategories();
    } catch (error) {
      debugLogger.error('Error loading categories:', error);
      analytics.trackError('load_categories', error.message);
      // Use default categories as fallback
      this.categories = [...this.defaultCategories];
      this.renderCategories();
    }
  }

  /**
   * Set up event listeners for category management
   */
  setupEventListeners() {
    // Add category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
      addCategoryBtn.addEventListener('click', () => this.addNewCategories());
    }
    
    // New category input (handle Enter key)
    const newCategoryInput = document.getElementById('newCategoryInput');
    if (newCategoryInput) {
      newCategoryInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          this.addNewCategories();
        }
      });
    }
    
    // Reset categories button
    const resetCategoriesBtn = document.getElementById('resetCategoriesBtn');
    if (resetCategoriesBtn) {
      resetCategoriesBtn.addEventListener('click', () => this.resetToDefaultCategories());
    }
    
    // Delete all categories button
    const deleteAllCategoriesBtn = document.getElementById('deleteAllCategoriesBtn');
    if (deleteAllCategoriesBtn) {
      deleteAllCategoriesBtn.addEventListener('click', () => this.deleteAllCategories());
    }
  }

  /**
   * Render categories in the UI
   */
  renderCategories() {
    if (!this.categoryTagsContainer) return;
    
    // Clear existing categories
    this.categoryTagsContainer.innerHTML = '';
    
    // Add each category as a tag
    this.categories.forEach(category => {
      const tag = document.createElement('div');
      tag.className = 'category-tag';
      tag.setAttribute('data-category', category);
      
      const tagText = document.createElement('span');
      tagText.textContent = category;
      tag.appendChild(tagText);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-tag';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.setAttribute('aria-label', `Remove ${category} category`);
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeCategory(category);
      });
      
      tag.appendChild(deleteBtn);
      this.categoryTagsContainer.appendChild(tag);
    });
  }

  /**
   * Add new categories from input
   */
  async addNewCategories() {
    try {
      const input = document.getElementById('newCategoryInput');
      if (!input || !input.value.trim()) return;
      
      // Split by comma and trim whitespace
      const newCategories = input.value
        .split(',')
        .map(cat => cat.trim())
        .filter(cat => cat && cat.length > 0);
      
      if (newCategories.length === 0) return;
      
      // Format categories (capitalize first letter)
      const formattedCategories = newCategories.map(cat => 
        cat.charAt(0).toUpperCase() + cat.slice(1)
      );
      
      // Add new categories (avoid duplicates)
      const uniqueNewCategories = formattedCategories.filter(cat => 
        !this.categories.includes(cat)
      );
      
      if (uniqueNewCategories.length > 0) {
        this.categories = [...this.categories, ...uniqueNewCategories];
        
        // Save to storage
        await chrome.storage.sync.set({ tabSorterCategories: this.categories });
        
        // Track category addition
        analytics.trackEvent('categories_added', {
          count: uniqueNewCategories.length,
          categories: uniqueNewCategories
        });
        
        // Update background script
        chrome.runtime.sendMessage({
          action: 'updateCategories',
          categories: this.categories,
          showNotification: false
        });
        
        // Re-render categories
        this.renderCategories();
      }
      
      // Clear input
      input.value = '';
    } catch (error) {
      debugLogger.error('Error adding categories:', error);
      analytics.trackError('add_categories', error.message);
    }
  }

  /**
   * Remove a category
   * @param {string} category - Category to remove
   */
  async removeCategory(category) {
    try {
      this.categories = this.categories.filter(cat => cat !== category);
      
      // Save to storage
      await chrome.storage.sync.set({ tabSorterCategories: this.categories });
      
      // Track category removal
      analytics.trackEvent('category_removed', { category });
      
      // Update background script
      chrome.runtime.sendMessage({
        action: 'updateCategories',
        categories: this.categories,
        showNotification: false
      });
      
      // Re-render categories
      this.renderCategories();
    } catch (error) {
      debugLogger.error('Error removing category:', error);
      analytics.trackError('remove_category', error.message);
    }
  }

  /**
   * Reset to default categories
   */
  async resetToDefaultCategories() {
    try {
      this.categories = [...this.defaultCategories];
      
      // Save to storage
      await chrome.storage.sync.set({ tabSorterCategories: this.categories });
      
      // Track reset action
      analytics.trackEvent('categories_reset');
      
      // Update background script
      chrome.runtime.sendMessage({
        action: 'updateCategories',
        categories: this.categories,
        showNotification: true
      });
      
      // Re-render categories
      this.renderCategories();
    } catch (error) {
      debugLogger.error('Error resetting categories:', error);
      analytics.trackError('reset_categories', error.message);
    }
  }

  /**
   * Delete all categories
   */
  async deleteAllCategories() {
    try {
      this.categories = [];
      
      // Save to storage
      await chrome.storage.sync.set({ tabSorterCategories: this.categories });
      
      // Track delete all action
      analytics.trackEvent('categories_deleted_all');
      
      // Update background script
      chrome.runtime.sendMessage({
        action: 'updateCategories',
        categories: this.categories,
        showNotification: true
      });
      
      // Re-render categories
      this.renderCategories();
    } catch (error) {
      debugLogger.error('Error deleting all categories:', error);
      analytics.trackError('delete_all_categories', error.message);
    }
  }
}