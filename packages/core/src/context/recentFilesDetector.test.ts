/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RecentFilesDetector } from './recentFilesDetector.js';

describe('RecentFilesDetector', () => {
  let detector: RecentFilesDetector;

  beforeEach(() => {
    detector = new RecentFilesDetector();
  });

  describe('getRecentFiles', () => {
    it('should return an array of files', async () => {
      // This is more of an integration test
      const files = await detector.getRecentFiles(process.cwd());
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeLessThanOrEqual(5);
    });

    it('should respect the count parameter', async () => {
      const files = await detector.getRecentFiles(process.cwd(), 2);
      expect(files.length).toBeLessThanOrEqual(2);
    });
  });

  describe('filterProjectFiles', () => {
    it('should filter out node_modules and build directories', () => {
      const files = [
        'src/app.ts',
        'node_modules/package/index.js',
        'dist/bundle.js',
        '.git/config',
        'src/components/Button.tsx'
      ];

      const filtered = detector.filterProjectFiles(files);
      expect(filtered).toEqual(['src/app.ts', 'src/components/Button.tsx']);
    });

    it('should filter out lock files and logs', () => {
      const files = [
        'src/app.ts',
        'package-lock.json',
        'yarn.lock',
        'error.log',
        '.DS_Store'
      ];

      const filtered = detector.filterProjectFiles(files);
      expect(filtered).toEqual(['src/app.ts']);
    });

    it('should handle empty array', () => {
      const filtered = detector.filterProjectFiles([]);
      expect(filtered).toEqual([]);
    });

    it('should filter out various build and cache directories', () => {
      const files = [
        'src/index.ts',
        'build/output.js',
        'coverage/report.html',
        '.next/cache/data.json',
        '.nuxt/dist/server.js',
        '.cache/webpack/bundle.js'
      ];

      const filtered = detector.filterProjectFiles(files);
      expect(filtered).toEqual(['src/index.ts']);
    });
  });
});