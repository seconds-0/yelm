/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectTypeDetector } from './projectTypeDetector.js';
import { readFile } from 'node:fs/promises';

vi.mock('node:fs/promises');

describe('ProjectTypeDetector', () => {
  let detector: ProjectTypeDetector;

  beforeEach(() => {
    detector = new ProjectTypeDetector();
    detector.clearCache();
    vi.clearAllMocks();
  });

  describe('detectProjectType', () => {
    it('should detect React project', async () => {
      const mockPackageJson = {
        name: 'react-app',
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0'
        }
      };

      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockPackageJson));

      const result = await detector.detectProjectType('/test/path');
      expect(result).toBe('react');
    });

    it('should detect Vue project', async () => {
      const mockPackageJson = {
        name: 'vue-app',
        dependencies: {
          'vue': '^3.3.0'
        }
      };

      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockPackageJson));

      const result = await detector.detectProjectType('/test/path');
      expect(result).toBe('vue');
    });

    it('should detect Angular project', async () => {
      const mockPackageJson = {
        name: 'angular-app',
        dependencies: {
          '@angular/core': '^16.0.0',
          '@angular/common': '^16.0.0'
        }
      };

      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockPackageJson));

      const result = await detector.detectProjectType('/test/path');
      expect(result).toBe('angular');
    });

    it('should detect Next.js project over React', async () => {
      const mockPackageJson = {
        name: 'nextjs-app',
        dependencies: {
          'next': '^13.4.0',
          'react': '^18.2.0',
          'react-dom': '^18.2.0'
        }
      };

      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockPackageJson));

      const result = await detector.detectProjectType('/test/path');
      expect(result).toBe('next');
    });

    it('should detect Node.js project', async () => {
      const mockPackageJson = {
        name: 'node-api',
        dependencies: {
          'express': '^4.18.0'
        }
      };

      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockPackageJson));

      const result = await detector.detectProjectType('/test/path');
      expect(result).toBe('node');
    });

    it('should detect Python project', async () => {
      vi.mocked(readFile)
        .mockRejectedValueOnce(new Error('No package.json'))
        .mockResolvedValueOnce('flask==2.3.0\npytest==7.4.0');

      const result = await detector.detectProjectType('/test/path');
      expect(result).toBe('python');
    });

    it('should return null for unknown project type', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('No config files'));

      const result = await detector.detectProjectType('/test/path');
      expect(result).toBe(null);
    });
  });

  describe('getProjectContext', () => {
    it('should detect TypeScript in project', async () => {
      const mockPackageJson = {
        name: 'ts-app',
        dependencies: {
          'react': '^18.2.0'
        },
        devDependencies: {
          'typescript': '^5.0.0'
        }
      };

      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockPackageJson));

      const context = await detector.getProjectContext('/test/path');
      expect(context.hasTypeScript).toBe(true);
      expect(context.framework).toBe('react');
    });

    it('should cache results', async () => {
      const mockPackageJson = {
        name: 'cached-app',
        dependencies: {
          'vue': '^3.3.0'
        }
      };

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(mockPackageJson))
        .mockRejectedValue(new Error('No config file')); // For build tool checks

      // First call
      const result1 = await detector.getProjectContext('/test/path');
      const callCount = vi.mocked(readFile).mock.calls.length;
      
      // Second call should use cache
      const result2 = await detector.getProjectContext('/test/path');

      expect(result1).toEqual(result2);
      expect(vi.mocked(readFile)).toHaveBeenCalledTimes(callCount); // No additional calls
    });

    it('should detect build tool from config file', async () => {
      const mockPackageJson = {
        name: 'vite-app',
        dependencies: {
          'react': '^18.2.0'
        }
      };

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(mockPackageJson))
        .mockResolvedValueOnce('export default {}'); // vite.config.js

      const context = await detector.getProjectContext('/test/path');
      expect(context.buildTool).toBe('vite');
    });

    it('should detect build tool from scripts', async () => {
      const mockPackageJson = {
        name: 'webpack-app',
        scripts: {
          'build': 'webpack --mode production',
          'dev': 'webpack serve'
        }
      };

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(mockPackageJson))
        .mockRejectedValue(new Error('No config file'));

      const context = await detector.getProjectContext('/test/path');
      expect(context.buildTool).toBe('webpack');
    });

    it('should detect build tool from dependencies', async () => {
      const mockPackageJson = {
        name: 'esbuild-app',
        devDependencies: {
          'esbuild': '^0.18.0'
        }
      };

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(mockPackageJson))
        .mockRejectedValue(new Error('No config file'));

      const context = await detector.getProjectContext('/test/path');
      expect(context.buildTool).toBe('esbuild');
    });
  });

  describe('edge cases', () => {
    it('should handle invalid JSON in package.json', async () => {
      vi.mocked(readFile).mockResolvedValueOnce('invalid json{');

      const result = await detector.detectProjectType('/test/path');
      expect(result).toBe(null);
    });

    it('should handle projects with multiple frameworks', async () => {
      const mockPackageJson = {
        name: 'multi-framework',
        dependencies: {
          'react': '^18.2.0',
          'vue': '^3.3.0'
        }
      };

      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockPackageJson));

      const result = await detector.detectProjectType('/test/path');
      // Should prioritize based on our order
      expect(result).toBe('vue');
    });

    it('should detect framework in devDependencies', async () => {
      const mockPackageJson = {
        name: 'dev-deps-app',
        devDependencies: {
          'react': '^18.2.0'
        }
      };

      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockPackageJson));

      const result = await detector.detectProjectType('/test/path');
      expect(result).toBe('react');
    });
  });
});