/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { Context7Wrapper } from './context7Wrapper.js';

describe('Context7Wrapper Integration', () => {
  // Note: This test assumes context7-cli is available in PATH
  // Run `npm link` in packages/cli to make it available

  it('should execute context7-cli and get results', async () => {
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

  it('should handle different libraries', async () => {
    const wrapper = new Context7Wrapper();
    const result = await wrapper.lookup({
      libraryName: 'vue',
      topic: 'composition'
    });

    expect(result.success).toBe(true);
    expect(result.documentation).toBe('Documentation for vue - composition');
  });

  it('should use default topic when not specified', async () => {
    const wrapper = new Context7Wrapper();
    const result = await wrapper.lookup({
      libraryName: 'angular'
    });

    expect(result.success).toBe(true);
    expect(result.topic).toBe('default');
    expect(result.documentation).toBe('Documentation for angular');
  });

  it('should handle unknown libraries', async () => {
    const wrapper = new Context7Wrapper();
    const result = await wrapper.lookup({
      libraryName: 'unknown-library'
    });

    // Current implementation returns success for all libraries
    // In a real implementation, this would check against a registry
    expect(result.success).toBe(true);
    expect(result.documentation).toBe('Documentation for unknown-library');
  });

  it('should respect timeout', async () => {
    const wrapper = new Context7Wrapper();
    const start = Date.now();
    
    // This should complete quickly
    const result = await wrapper.lookup({
      libraryName: 'react',
      timeout: 5000 // Reasonable timeout
    });
    
    const duration = Date.now() - start;
    
    expect(result.success).toBe(true);
    // Just verify it didn't timeout (5s is plenty for a mock command)
    expect(duration).toBeLessThan(5000);
  });
});