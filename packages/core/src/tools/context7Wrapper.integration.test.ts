/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Context7Wrapper } from './context7Wrapper.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('Context7Wrapper Integration', () => {
  let isContext7Available = false;

  beforeAll(async () => {
    // Check if context7-cli is available in PATH
    try {
      await execFileAsync('which', ['context7-cli']);
      isContext7Available = true;
    } catch {
      // context7-cli not in PATH, skip integration tests
      isContext7Available = false;
    }
  });

  // Note: This test assumes context7-cli is available in PATH
  // Run `npm link` in packages/cli to make it available

  it.skipIf(!isContext7Available)('should execute context7-cli and get results', async () => {
    const wrapper = new Context7Wrapper();
    const result = await wrapper.lookup({
      libraryName: 'react',
      topic: 'hooks'
    });

    expect(result.success).toBe(true);
    expect(result.documentation).toBe('Documentation for react - hooks');
    expect(result.library).toBe('react');
    expect(result.topic).toBe('hooks');
  });

  it.skipIf(!isContext7Available)('should handle different libraries', async () => {
    const wrapper = new Context7Wrapper();
    const result = await wrapper.lookup({
      libraryName: 'vue',
      topic: 'composition'
    });

    expect(result.success).toBe(true);
    expect(result.documentation).toBe('Documentation for vue - composition');
  });

  it.skipIf(!isContext7Available)('should use default topic when not specified', async () => {
    const wrapper = new Context7Wrapper();
    const result = await wrapper.lookup({
      libraryName: 'angular'
    });

    expect(result.success).toBe(true);
    expect(result.topic).toBe('default');
    expect(result.documentation).toBe('Documentation for angular');
  });

  it.skipIf(!isContext7Available)('should handle unknown libraries', async () => {
    const wrapper = new Context7Wrapper();
    const result = await wrapper.lookup({
      libraryName: 'unknown-library'
    });

    // Current implementation returns success for all libraries
    // In a real implementation, this would check against a registry
    expect(result.success).toBe(true);
    expect(result.documentation).toBe('Documentation for unknown-library');
  });

  it.skipIf(!isContext7Available)('should respect timeout', async () => {
    const wrapper = new Context7Wrapper();
    const start = Date.now();
    
    // This should complete quickly
    const result = await wrapper.lookup({
      libraryName: 'react',
      timeout: 100 // Very short timeout, but should still work
    });
    
    const duration = Date.now() - start;
    
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(150); // Should complete within timeout
  });
});