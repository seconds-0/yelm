/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { ContextFileScanner, FileIndex } from './directoryScanner.js';
import { FileDiscoveryService } from './fileDiscoveryService.js';

/**
 * Configuration for context file discovery
 */
export interface ContextFileConfig {
  /** Priority-ordered list of context file names to search for */
  hierarchy: string[];
  /** Global directories to search (e.g., ~/.yelm, ~/.gemini) */
  globalDirs: string[];
  /** Maximum directory depth to scan */
  maxDepth: number;
  /** Patterns to ignore during directory traversal */
  ignorePatterns: string[];
  /** Whether to enable caching of discovery results */
  cacheEnabled: boolean;
  /** Maximum number of directories to scan */
  maxDirs: number;
}

/**
 * Result of context file discovery
 */
export interface ContextFileResult {
  /** Absolute path to the context file */
  path: string;
  /** Type of context file (e.g., 'agents.md', 'GEMINI.md') */
  type: string;
  /** Priority of this file type (lower number = higher priority) */
  priority: number;
  /** Last modified timestamp for caching */
  lastModified: number;
  /** Directory level where file was found (0 = CWD, 1 = parent, etc.) */
  level: number;
}

/**
 * Options for directory discovery
 */
export interface DiscoveryOptions {
  /** Working directory to start discovery from */
  workingDir: string;
  /** Whether to enable debug logging */
  debug?: boolean;
  /** Additional extension context file paths */
  extensionContextFiles?: string[];
  /** File discovery service for gitignore support */
  fileService?: FileDiscoveryService;
}

/**
 * Cache entry for discovered files
 */
interface CacheEntry {
  /** Discovery results */
  results: ContextFileResult[];
  /** Timestamp when discovery was performed */
  timestamp: number;
  /** Directory modification times for cache invalidation */
  dirModTimes: Map<string, number>;
}

/**
 * Custom errors for context file discovery
 */
export class ContextFileError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ContextFileError';
  }
}

export class PermissionError extends ContextFileError {
  constructor(path: string) {
    super(`Permission denied accessing: ${path}`, 'PERMISSION_DENIED');
  }
}

export class ConfigurationError extends ContextFileError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
  }
}

/**
 * Default configuration for context file discovery
 */
export const DEFAULT_CONTEXT_CONFIG: ContextFileConfig = {
  hierarchy: ['agents.md', 'CLAUDE.md', 'GEMINI.md', '.cursor/rules'],
  globalDirs: ['.yelm', '.gemini'],
  maxDepth: 20,
  ignorePatterns: [
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    'dist',
    'build',
    'coverage',
    '.next',
    '.cache',
    'tmp',
    'temp'
  ],
  cacheEnabled: true,
  maxDirs: 200
};

/**
 * Core service for discovering context files in a hierarchical manner
 */
export class ContextFileDiscovery {
  private cache = new Map<string, CacheEntry>();
  private scanner: ContextFileScanner;
  private readonly logger = {
    debug: (message: string) => this.debug && console.debug(`[ContextFileDiscovery] ${message}`),
    warn: (message: string) => console.warn(`[ContextFileDiscovery] ${message}`),
    error: (message: string) => console.error(`[ContextFileDiscovery] ${message}`)
  };

  constructor(
    private readonly config: ContextFileConfig = DEFAULT_CONTEXT_CONFIG,
    private readonly debug: boolean = false
  ) {
    this.validateConfig();
    this.scanner = new ContextFileScanner(this.debug);
  }

  /**
   * Discover context files starting from the working directory
   */
  async discover(options: DiscoveryOptions): Promise<ContextFileResult[]> {
    const { workingDir, debug = false, extensionContextFiles = [], fileService } = options;
    
    this.logger.debug(`Starting discovery from: ${workingDir}`);
    
    // Check cache first
    const cacheKey = this.getCacheKey(workingDir);
    if (this.config.cacheEnabled && this.isCacheValid(cacheKey, workingDir)) {
      this.logger.debug('Using cached results');
      return this.cache.get(cacheKey)!.results;
    }

    const results: ContextFileResult[] = [];
    
    try {
      // 1. Discover global context files
      const globalFiles = await this.discoverGlobalFiles();
      results.push(...globalFiles);

      // 2. Discover project files using optimized scanner
      const projectFiles = await this.discoverProjectFilesOptimized(workingDir, fileService);
      results.push(...projectFiles);

      // 3. Add extension context files
      const extensionFiles = await this.processExtensionFiles(extensionContextFiles);
      results.push(...extensionFiles);

      // Sort by priority and level
      results.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.priority - b.priority;
      });

      // Cache results
      if (this.config.cacheEnabled) {
        await this.cacheResults(cacheKey, workingDir, results);
      }

      this.logger.debug(`Discovery complete. Found ${results.length} files`);
      return results;
      
    } catch (error) {
      this.logger.error(`Discovery failed: ${error}`);
      throw error;
    }
  }

  /**
   * Find the first context file in a specific directory
   */
  async findInDirectory(directory: string): Promise<ContextFileResult | null> {
    this.logger.debug(`Searching in directory: ${directory}`);
    
    try {
      // Check if directory exists and is accessible
      await fs.access(directory, fsSync.constants.R_OK);
    } catch (error) {
      this.logger.debug(`Directory not accessible: ${directory}`);
      return null;
    }

    // Search for files in priority order
    for (let i = 0; i < this.config.hierarchy.length; i++) {
      const filename = this.config.hierarchy[i];
      const result = await this.checkFile(directory, filename, i);
      if (result) {
        return result;
      }
    }

    return null;
  }

  /**
   * Clear the discovery cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }

  /**
   * Check if a specific file exists and create result
   */
  private async checkFile(directory: string, filename: string, priority: number): Promise<ContextFileResult | null> {
    let filePath: string;
    
    // Special handling for .cursor/rules
    if (filename === '.cursor/rules') {
      filePath = path.join(directory, '.cursor', 'rules');
    } else {
      filePath = path.join(directory, filename);
    }

    try {
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        this.logger.debug(`Found context file: ${filePath}`);
        
        // Log migration suggestion for legacy files
        if (filename === 'GEMINI.md' && !process.env.VITEST && !process.env.NODE_ENV?.includes('test')) {
          this.logger.warn(`Found GEMINI.md at ${filePath}. Consider renaming to agents.md for better AI assistant support.`);
        }
        
        return {
          path: filePath,
          type: filename,
          priority,
          lastModified: stats.mtime.getTime(),
          level: 0 // Will be set correctly by caller
        };
      }
    } catch (error) {
      // File doesn't exist or isn't accessible
      this.logger.debug(`File not found: ${filePath}`);
    }
    
    return null;
  }

  /**
   * Discover global context files
   */
  private async discoverGlobalFiles(): Promise<ContextFileResult[]> {
    const results: ContextFileResult[] = [];
    const userHome = homedir();
    
    // Check global directories in order of preference
    for (const globalDir of this.config.globalDirs) {
      const globalPath = path.join(userHome, globalDir);
      
      try {
        await fs.access(globalPath, fsSync.constants.R_OK);
        const result = await this.findInDirectory(globalPath);
        if (result) {
          result.level = -1; // Global files have highest priority
          results.push(result);
          break; // Only use first global directory that has files
        }
      } catch (error) {
        this.logger.debug(`Global directory not accessible: ${globalPath}`);
      }
    }
    
    return results;
  }

  /**
   * Discover project context files using optimized scanner
   */
  private async discoverProjectFilesOptimized(startDir: string, fileService?: FileDiscoveryService): Promise<ContextFileResult[]> {
    const results: ContextFileResult[] = [];
    
    try {
      // Use the scanner to get all files in one pass
      const { index } = await this.scanner.scanForContextFiles(startDir, this.config.hierarchy, {
        maxDepth: this.config.maxDepth,
        maxDirs: this.config.maxDirs,
        ignorePatterns: this.config.ignorePatterns,
        fileService,
        debug: this.debug
      });
      
      // Find context files in priority order
      const contextFiles = this.scanner.findContextFiles(index, this.config.hierarchy);
      
      // Convert to ContextFileResult objects
      for (const [directory, fileInfo] of contextFiles.entries()) {
        const priority = this.config.hierarchy.indexOf(fileInfo.name);
        if (priority !== -1) {
          // Log migration suggestion for legacy files
          if (fileInfo.name === 'GEMINI.md' && !process.env.VITEST && !process.env.NODE_ENV?.includes('test')) {
            this.logger.warn(`Found GEMINI.md at ${fileInfo.path}. Consider renaming to agents.md for better AI assistant support.`);
          }
          
          results.push({
            path: fileInfo.path,
            type: fileInfo.name,
            priority,
            lastModified: fileInfo.lastModified,
            level: fileInfo.depth
          });
        }
      }
      
      this.logger.debug(`Found ${results.length} context files using optimized scanner`);
      
    } catch (error) {
      this.logger.error(`Optimized discovery failed, falling back to original method: ${error}`);
      // Fallback to original method
      return this.discoverProjectFiles(startDir);
    }
    
    return results;
  }

  /**
   * Discover project context files hierarchically (fallback method)
   */
  private async discoverProjectFiles(startDir: string): Promise<ContextFileResult[]> {
    const results: ContextFileResult[] = [];
    const visited = new Set<string>();
    
    let currentDir = path.resolve(startDir);
    let level = 0;
    
    // Find project root
    const projectRoot = await this.findProjectRoot(currentDir);
    const stopDir = projectRoot ? path.dirname(projectRoot) : path.dirname(homedir());
    
    while (currentDir && currentDir !== path.dirname(currentDir)) {
      if (visited.has(currentDir)) break;
      visited.add(currentDir);
      
      // Skip global directories during project scan
      if (this.config.globalDirs.some(dir => currentDir.endsWith(path.join(homedir(), dir)))) {
        currentDir = path.dirname(currentDir);
        continue;
      }
      
      this.logger.debug(`Scanning project directory: ${currentDir} (level ${level})`);
      
      const result = await this.findInDirectory(currentDir);
      if (result) {
        result.level = level;
        results.push(result);
      }
      
      // Stop at project root
      if (currentDir === stopDir) {
        this.logger.debug(`Reached project boundary: ${currentDir}`);
        break;
      }
      
      currentDir = path.dirname(currentDir);
      level++;
      
      // Prevent infinite loops
      if (level > this.config.maxDepth) {
        this.logger.warn(`Maximum depth reached: ${this.config.maxDepth}`);
        break;
      }
    }
    
    return results;
  }

  /**
   * Find project root by looking for .git directory
   */
  private async findProjectRoot(startDir: string): Promise<string | null> {
    let currentDir = path.resolve(startDir);
    
    while (currentDir !== path.dirname(currentDir)) {
      try {
        const gitPath = path.join(currentDir, '.git');
        const stats = await fs.stat(gitPath);
        if (stats.isDirectory()) {
          return currentDir;
        }
      } catch (error) {
        // Continue searching
      }
      
      currentDir = path.dirname(currentDir);
    }
    
    return null;
  }

  /**
   * Process extension context files
   */
  private async processExtensionFiles(extensionFiles: string[]): Promise<ContextFileResult[]> {
    const results: ContextFileResult[] = [];
    
    for (const filePath of extensionFiles) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          results.push({
            path: filePath,
            type: 'extension',
            priority: 999, // Extensions have lowest priority
            lastModified: stats.mtime.getTime(),
            level: 1000 // Extensions come after all other files
          });
        }
      } catch (error) {
        this.logger.warn(`Extension file not accessible: ${filePath}`);
      }
    }
    
    return results;
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.hierarchy || this.config.hierarchy.length === 0) {
      throw new ConfigurationError('Context file hierarchy cannot be empty');
    }
    
    if (!this.config.globalDirs || this.config.globalDirs.length === 0) {
      throw new ConfigurationError('Global directories cannot be empty');
    }
    
    if (this.config.maxDepth < 1) {
      throw new ConfigurationError('Maximum depth must be at least 1');
    }
    
    if (this.config.maxDirs < 1) {
      throw new ConfigurationError('Maximum directories must be at least 1');
    }
  }

  /**
   * Generate cache key for a working directory
   */
  private getCacheKey(workingDir: string): string {
    return `discovery:${path.resolve(workingDir)}`;
  }

  /**
   * Check if cache is valid for a working directory
   */
  private isCacheValid(cacheKey: string, workingDir: string): boolean {
    const entry = this.cache.get(cacheKey);
    if (!entry) return false;
    
    // Check if cache is too old (5 minutes)
    const now = Date.now();
    if (now - entry.timestamp > 5 * 60 * 1000) {
      this.cache.delete(cacheKey);
      return false;
    }
    
    // Check if directories have been modified
    for (const [dir, cachedTime] of entry.dirModTimes.entries()) {
      try {
        const stats = fsSync.statSync(dir);
        if (stats.mtime.getTime() !== cachedTime) {
          this.cache.delete(cacheKey);
          return false;
        }
      } catch (error) {
        // Directory no longer exists or accessible
        this.cache.delete(cacheKey);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Cache discovery results
   */
  private async cacheResults(cacheKey: string, workingDir: string, results: ContextFileResult[]): Promise<void> {
    const dirModTimes = new Map<string, number>();
    
    // Collect directory modification times for cache invalidation
    const dirsToCheck = new Set<string>();
    dirsToCheck.add(workingDir);
    
    for (const result of results) {
      dirsToCheck.add(path.dirname(result.path));
    }
    
    for (const dir of dirsToCheck) {
      try {
        const stats = await fs.stat(dir);
        dirModTimes.set(dir, stats.mtime.getTime());
      } catch (error) {
        // Directory not accessible, skip caching
        this.logger.debug(`Cannot cache, directory not accessible: ${dir}`);
        return;
      }
    }
    
    this.cache.set(cacheKey, {
      results: [...results], // Create copy to avoid mutation
      timestamp: Date.now(),
      dirModTimes
    });
    
    this.logger.debug(`Cached results for: ${workingDir}`);
  }
}