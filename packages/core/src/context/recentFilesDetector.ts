/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { stat } from 'node:fs/promises';

const execAsync = promisify(exec);

export class RecentFilesDetector {
  async getRecentFiles(projectPath: string, count = 5): Promise<string[]> {
    try {
      // Try using git first (most accurate for project files)
      const gitFiles = await this.getRecentGitFiles(projectPath, count);
      if (gitFiles.length > 0) {
        return gitFiles;
      }
    } catch {
      // Not a git repo or git command failed
    }

    // Fallback to filesystem scan (less accurate but works everywhere)
    return this.getRecentFilesystem(projectPath, count);
  }

  private async getRecentGitFiles(projectPath: string, count: number): Promise<string[]> {
    try {
      // Get recently modified files from git
      const { stdout } = await execAsync(
        `git ls-files --modified --others --exclude-standard | head -${count}`,
        { cwd: projectPath }
      );

      const modifiedFiles = stdout.trim().split('\n').filter(Boolean);
      
      if (modifiedFiles.length < count) {
        // Also get recently committed files
        const { stdout: committedStdout } = await execAsync(
          `git log --name-only --pretty=format: -n 10 | grep -v '^$' | sort -u | head -${count}`,
          { cwd: projectPath }
        );
        
        const committedFiles = committedStdout.trim().split('\n').filter(Boolean);
        const allFiles = [...new Set([...modifiedFiles, ...committedFiles])];
        return allFiles.slice(0, count);
      }

      return modifiedFiles;
    } catch {
      throw new Error('Git command failed');
    }
  }

  private async getRecentFilesystem(projectPath: string, count: number): Promise<string[]> {
    // Simple fallback - just return common source files
    // In a real implementation, we'd walk the directory tree
    const commonFiles = [
      'src/index.ts',
      'src/index.js', 
      'src/App.tsx',
      'src/App.jsx',
      'src/main.ts',
      'src/main.js',
      'index.ts',
      'index.js',
      'app.ts',
      'app.js'
    ];

    const existingFiles: string[] = [];
    
    for (const file of commonFiles) {
      try {
        await stat(join(projectPath, file));
        existingFiles.push(file);
        if (existingFiles.length >= count) break;
      } catch {
        // File doesn't exist
      }
    }

    return existingFiles;
  }

  filterProjectFiles(files: string[]): string[] {
    // Filter out common non-source files
    const excludePatterns = [
      /node_modules\//,
      /\.git\//,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.next\//,
      /\.nuxt\//,
      /\.cache\//,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /\.log$/,
      /\.DS_Store$/
    ];

    return files.filter(file => 
      !excludePatterns.some(pattern => pattern.test(file))
    );
  }
}