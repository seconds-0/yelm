/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Logger interface for Context7 operations.
 * This abstraction allows for better testability and future enhancements
 * such as structured logging, log levels, and external logging services.
 */
export interface Context7Logger {
  /**
   * Log debug information
   * @param message The debug message
   * @param context Optional structured context data
   */
  debug(message: string, context?: Record<string, unknown>): void;
  
  /**
   * Log error information
   * @param message The error message
   * @param error Optional error object
   * @param context Optional structured context data
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

/**
 * Default console-based implementation of Context7Logger
 */
export class ConsoleContext7Logger implements Context7Logger {
  private readonly prefix = '[Context7 Debug]';
  
  debug(message: string, context?: Record<string, unknown>): void {
    console.log(`${this.prefix} ${message}`);
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          console.log(`  ${key}:`, value);
        }
      });
    }
  }
  
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    console.log(`${this.prefix} ${message}`);
    if (error) {
      console.log('  Error:', error.message);
      if (error.stack) {
        console.log('  Stack trace:', error.stack);
      }
    }
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          console.log(`  ${key}:`, value);
        }
      });
    }
  }
}

/**
 * Factory function to create a logger instance
 * In the future, this could return different logger implementations
 * based on configuration (e.g., structured JSON logging, external services)
 */
export function createContext7Logger(): Context7Logger {
  return new ConsoleContext7Logger();
}

/**
 * Example of how to use this in Context7Wrapper:
 * 
 * ```typescript
 * import { createContext7Logger } from './context7Logger.js';
 * 
 * export class Context7Wrapper {
 *   private logger = createContext7Logger();
 *   
 *   async lookup(options: Context7Options): Promise<Context7Result> {
 *     if (options.debug) {
 *       this.logger.debug('Making API call', {
 *         command: 'context7-cli',
 *         args,
 *         library: options.libraryName,
 *         topic: options.topic,
 *         tokens: options.tokens,
 *         timeout: options.timeout || DEFAULT_TIMEOUT_MS,
 *         timestamp: new Date().toISOString()
 *       });
 *     }
 *   }
 * }
 * ```
 */