/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

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
}

export class Context7Wrapper {
  async lookup(options: Context7Options): Promise<Context7Result> {
    try {
      const args = [options.libraryName];
      if (options.topic) args.push(options.topic);
      if (options.tokens) args.push(options.tokens.toString());
      
      const { stdout } = await execFileAsync('context7-cli', args, {
        timeout: options.timeout || 3000
      });
      
      return JSON.parse(stdout);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}