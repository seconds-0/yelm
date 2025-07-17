/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for Yelm Core functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { YelmCore } from '../../packages/core/src/index.js';

describe('YelmCore', () => {
  let core: YelmCore;

  beforeEach(() => {
    core = new YelmCore();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      await expect(core.initialize()).resolves.not.toThrow();
    });

    it('should initialize with custom configuration', async () => {
      const config = {
        enableContext7: false,
        analyzeProject: true,
        includeFiles: ['test.ts']
      };
      
      await expect(core.initialize(config)).resolves.not.toThrow();
    });
  });

  describe('project analysis', () => {
    beforeEach(async () => {
      await core.initialize();
    });

    it('should analyze project structure', async () => {
      const analysis = await core.analyzeProject();
      
      expect(analysis).toHaveProperty('frameworks');
      expect(analysis).toHaveProperty('languages');
      expect(analysis).toHaveProperty('buildTools');
      expect(analysis).toHaveProperty('fileCount');
      expect(analysis).toHaveProperty('structure');
      expect(analysis).toHaveProperty('patterns');
      
      expect(Array.isArray(analysis.frameworks)).toBe(true);
      expect(Array.isArray(analysis.languages)).toBe(true);
      expect(Array.isArray(analysis.buildTools)).toBe(true);
    });

    it('should detect TypeScript and JavaScript', async () => {
      const analysis = await core.analyzeProject();
      
      // Should detect TypeScript (we have tsconfig.json)
      expect(analysis.languages).toContain('TypeScript');
      
      // Should detect JavaScript (we have package.json)
      expect(analysis.languages).toContain('JavaScript');
    });

    it('should detect esbuild as build tool', async () => {
      const analysis = await core.analyzeProject();
      
      // Should detect esbuild (it's in our devDependencies)
      expect(analysis.buildTools).toContain('esbuild');
    });
  });

  describe('documentation lookup', () => {
    beforeEach(async () => {
      await core.initialize({ enableContext7: true });
    });

    it('should handle Context7 unavailable gracefully', async () => {
      const result = await core.getDocumentation('test.ts');
      
      expect(result).toHaveProperty('filePath', 'test.ts');
      expect(result).toHaveProperty('documentation');
      expect(Array.isArray(result.documentation)).toBe(true);
      
      // Should have fallback when Context7 is unavailable
      if (result.error) {
        expect(result.fallback).toBe(true);
      }
    });

    it('should respect Context7 disabled configuration', async () => {
      await core.initialize({ enableContext7: false });
      
      const result = await core.getDocumentation('test.ts');
      
      expect(result.fallback).toBe(true);
      expect(result.error).toBe('Context7 disabled');
    });
  });
});