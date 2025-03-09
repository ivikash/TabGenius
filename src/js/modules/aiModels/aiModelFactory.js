import { GeminiModel } from './geminiModel.js';
import { OllamaModel } from './ollamaModel.js';

/**
 * Factory for creating AI model instances
 */
export class AIModelFactory {
  /**
   * Create an AI model instance based on configuration
   * @param {Object} config - Configuration for the AI model
   * @param {string} config.type - Type of AI model ('gemini' or 'ollama')
   * @param {string} [config.url] - URL for Ollama API (required for Ollama)
   * @param {string} [config.model] - Model name for Ollama (required for Ollama)
   * @returns {Object} - AI model instance
   */
  static createModel(config) {
    switch (config.type) {
      case 'gemini':
        return new GeminiModel();
      case 'ollama':
        if (!config.url || !config.model) {
          throw new Error('Ollama URL and model name are required');
        }
        return new OllamaModel(config.url, config.model);
      default:
        throw new Error(`Unsupported AI model type: ${config.type}`);
    }
  }
}