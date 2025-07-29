/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Default timeout for Context7 API calls in milliseconds
const DEFAULT_TIMEOUT_MS = 3000;

// Validation pattern for library names (alphanumeric, dash, underscore, dot, @, /)
const VALID_LIBRARY_NAME_PATTERN = /^[@a-zA-Z0-9/_.-]+$/;

export interface Context7Result {
  success: boolean;
  documentation?: string;
  error?: string;
  library?: string;
  topic?: string;
  timestamp?: number;
}

export interface Context7Options {
  libraryName: string;
  topic?: string;
  tokens?: number;
  timeout?: number;
  debug?: boolean;
}

export class Context7Wrapper {
  /**
   * Looks up documentation for a library using the context7-cli tool.
   * 
   * @param options - The lookup options including library name, topic, and debug settings
   * @returns A promise resolving to the Context7Result with documentation or error information
   */
  async lookup(options: Context7Options): Promise<Context7Result> {
    try {
      // Validate library name to prevent command injection
      if (!VALID_LIBRARY_NAME_PATTERN.test(options.libraryName)) {
        const error = `Invalid library name: ${options.libraryName}. Only alphanumeric characters, dashes, underscores, dots, @ and / are allowed.`;
        if (options.debug) {
          console.log('[Context7 Debug] Input validation failed:', error);
        }
        return {
          success: false,
          error
        };
      }
      
      const args = [options.libraryName];
      if (options.topic) args.push(options.topic);
      if (options.tokens) args.push(options.tokens.toString());
      
      // Log the API call details in debug mode
      if (options.debug) {
        console.log('\n[Context7 Debug] Making API call:');
        console.log('  Command:', 'context7-cli');
        console.log('  Arguments:', args);
        console.log('  Library:', options.libraryName);
        if (options.topic) console.log('  Topic:', options.topic);
        if (options.tokens) console.log('  Tokens:', options.tokens);
        console.log('  Timeout:', options.timeout || DEFAULT_TIMEOUT_MS, 'ms');
        console.log('  Timestamp:', new Date().toISOString());
      }
      
      const startTime = Date.now();
      const { stdout } = await execFileAsync('context7-cli', args, {
        timeout: options.timeout || DEFAULT_TIMEOUT_MS
      });
      const duration = Date.now() - startTime;
      
      let result: Context7Result;
      try {
        result = JSON.parse(stdout);
      } catch (parseError) {
        if (options.debug) {
          console.log('[Context7 Debug] Failed to parse response:', stdout);
          console.log('[Context7 Debug] Parse error:', parseError instanceof Error ? parseError.message : 'Unknown parse error');
        }
        return {
          success: false,
          error: 'Invalid response format from context7-cli'
        };
      }
      
      // Log the response in debug mode
      if (options.debug) {
        console.log('\n[Context7 Debug] API response:');
        console.log('  Duration:', duration, 'ms');
        console.log('  Success:', result.success);
        if (result.library) console.log('  Library:', result.library);
        if (result.topic) console.log('  Topic:', result.topic);
        if (result.documentation) {
          console.log('  Documentation length:', result.documentation.length, 'characters');
          const preview = result.documentation.length > 200 
            ? result.documentation.substring(0, 200) + '...'
            : result.documentation;
          console.log('  Documentation preview:', preview);
        }
        if (result.error) console.log('  Error:', result.error);
        console.log('  Raw response:', JSON.stringify(result, null, 2));
      }
      
      return result;
    } catch (error) {
      if (options.debug) {
        console.log('\n[Context7 Debug] API call failed:');
        console.log('  Error:', error instanceof Error ? error.message : 'Unknown error');
        if (error instanceof Error && error.stack) {
          console.log('  Stack trace:', error.stack);
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}