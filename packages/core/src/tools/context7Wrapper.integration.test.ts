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

  it('should handle debug mode without errors', async () => {
    const wrapper = new Context7Wrapper();
    
    // Capture console output
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.map(arg => String(arg)).join(' '));
    };
    
    try {
      const result = await wrapper.lookup({
        libraryName: 'react',
        topic: 'hooks',
        tokens: 5000,
        debug: true
      });
      
      expect(result.success).toBe(true);
      
      // Verify debug output was generated (more flexible matching)
      const allLogs = logs.join('\n');
      expect(allLogs).toContain('[Context7 Debug]');
      expect(allLogs).toContain('Making API call');
      expect(allLogs).toContain('react');
      expect(allLogs).toContain('hooks');
      expect(allLogs).toContain('5000');
      expect(allLogs).toContain('API response');
    } finally {
      // Restore console.log
      console.log = originalLog;
    }
  });

  it('should reject invalid library names', async () => {
    const wrapper = new Context7Wrapper();
    
    // Test various invalid library names
    const invalidNames = [
      'library with spaces',
      'library;rm -rf /',
      'library$(whoami)',
      'library`echo hack`',
      'library|ls',
      'library&& echo test',
      'library\'; DROP TABLE--'
    ];
    
    for (const invalidName of invalidNames) {
      const result = await wrapper.lookup({
        libraryName: invalidName,
        debug: false
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid library name');
      expect(result.error).toContain('Only alphanumeric characters');
    }
  });

  it('should accept valid library names', async () => {
    const wrapper = new Context7Wrapper();
    
    // Test various valid library names
    const validNames = [
      'react',
      'vue-js',
      'angular_framework',
      '@angular/core',
      'lodash.debounce',
      'express/middleware',
      '@types/node',
      'babel-preset-env'
    ];
    
    for (const validName of validNames) {
      const result = await wrapper.lookup({
        libraryName: validName,
        debug: false
      });
      
      // Should not fail due to validation
      if (result.error) {
        expect(result.error).not.toContain('Invalid library name');
      }
    }
  });
});