/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { FileDiscoveryService } from './fileDiscoveryService.js';

/**
 * Options for directory scanning
 */
export interface ScanOptions {
  /** Maximum depth to scan */
  maxDepth: number;
  /** Maximum number of directories to scan */
  maxDirs: number;
  /** Patterns to ignore */
  ignorePatterns: string[];
  /** File discovery service for gitignore support */
  fileService?: FileDiscoveryService;
  /** Whether to enable debug logging */
  debug?: boolean;
}

/**
 * Information about a discovered file
 */
export interface FileInfo {
  /** Absolute path to the file */
  path: string;
  /** File name only */
  name: string;
  /** Directory containing the file */
  directory: string;
  /** Relative path from scan root */
  relativePath: string;
  /** Last modified time */
  lastModified: number;
  /** File size in bytes */
  size: number;
  /** Directory depth from scan root */
  depth: number;
}

/**
 * Result of directory scanning
 */
export interface ScanResult {
  /** All discovered files */
  files: FileInfo[];
  /** Number of directories scanned */
  directoriesScanned: number;
  /** Number of files found */
  filesFound: number;
  /** Scan duration in milliseconds */
  duration: number;
  /** Whether scan was stopped due to limits */
  limitReached: boolean;
}

/**
 * Index of files organized by various criteria
 */
export interface FileIndex {
  /** Files organized by name */
  byName: Map<string, FileInfo[]>;
  /** Files organized by directory */
  byDirectory: Map<string, FileInfo[]>;
  /** Files organized by depth */
  byDepth: Map<number, FileInfo[]>;
  /** All files in scan order */
  all: FileInfo[];
}

/**
 * Efficient single-pass directory scanner
 */
export class DirectoryScanner {
  private readonly logger = {
    debug: (message: string) => this.debug && console.debug(`[DirectoryScanner] ${message}`),
    warn: (message: string) => console.warn(`[DirectoryScanner] ${message}`),
    error: (message: string) => console.error(`[DirectoryScanner] ${message}`)
  };

  constructor(private readonly debug: boolean = false) {}

  /**
   * Scan a directory and build a complete file index
   */
  async scanDirectory(rootDir: string, options: ScanOptions): Promise<ScanResult> {
    const startTime = Date.now();
    const files: FileInfo[] = [];
    let directoriesScanned = 0;
    let limitReached = false;

    this.logger.debug(`Starting scan of: ${rootDir}`);

    try {
      // Validate root directory
      const rootStats = await fs.stat(rootDir);
      if (!rootStats.isDirectory()) {
        throw new Error(`Root path is not a directory: ${rootDir}`);
      }

      // Perform breadth-first scan
      const queue: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }];
      const visited = new Set<string>();

      while (queue.length > 0 && directoriesScanned < options.maxDirs) {
        const { dir, depth } = queue.shift()!;
        const resolvedDir = path.resolve(dir);

        // Skip if already visited (prevents loops)
        if (visited.has(resolvedDir)) {
          continue;
        }
        visited.add(resolvedDir);

        // Check depth limit
        if (depth > options.maxDepth) {
          this.logger.debug(`Skipping directory due to depth limit: ${resolvedDir}`);
          continue;
        }

        // Skip ignored directories
        if (this.shouldIgnoreDirectory(resolvedDir, options.ignorePatterns)) {
          this.logger.debug(`Skipping ignored directory: ${resolvedDir}`);
          continue;
        }

        // Skip if gitignored
        if (options.fileService?.shouldGitIgnoreFile(resolvedDir)) {
          this.logger.debug(`Skipping gitignored directory: ${resolvedDir}`);
          continue;
        }

        directoriesScanned++;
        this.logger.debug(`Scanning directory [${directoriesScanned}/${options.maxDirs}]: ${resolvedDir} (depth: ${depth})`);

        try {
          const entries = await fs.readdir(resolvedDir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(resolvedDir, entry.name);
            
            if (entry.isDirectory()) {
              // Add subdirectory to queue
              queue.push({ dir: fullPath, depth: depth + 1 });
            } else if (entry.isFile()) {
              // Process file
              const fileInfo = await this.createFileInfo(fullPath, rootDir, depth, options);
              if (fileInfo) {
                files.push(fileInfo);
              }
            }
          }
        } catch (error) {
          // Log error but continue scanning
          this.logger.warn(`Could not read directory ${resolvedDir}: ${error}`);
        }
      }

      // Check if we hit limits
      if (directoriesScanned >= options.maxDirs) {
        limitReached = true;
        this.logger.warn(`Directory scan limit reached: ${options.maxDirs}`);
      }

    } catch (error) {
      this.logger.error(`Scan failed: ${error}`);
      throw error;
    }

    const duration = Date.now() - startTime;
    this.logger.debug(`Scan completed in ${duration}ms. Found ${files.length} files in ${directoriesScanned} directories.`);

    return {
      files,
      directoriesScanned,
      filesFound: files.length,
      duration,
      limitReached
    };
  }

  /**
   * Build an index from scan results for efficient lookups
   */
  buildFileIndex(scanResult: ScanResult): FileIndex {
    const byName = new Map<string, FileInfo[]>();
    const byDirectory = new Map<string, FileInfo[]>();
    const byDepth = new Map<number, FileInfo[]>();

    for (const file of scanResult.files) {
      // Index by name
      if (!byName.has(file.name)) {
        byName.set(file.name, []);
      }
      byName.get(file.name)!.push(file);

      // Index by directory
      if (!byDirectory.has(file.directory)) {
        byDirectory.set(file.directory, []);
      }
      byDirectory.get(file.directory)!.push(file);

      // Index by depth
      if (!byDepth.has(file.depth)) {
        byDepth.set(file.depth, []);
      }
      byDepth.get(file.depth)!.push(file);
    }

    return {
      byName,
      byDirectory,
      byDepth,
      all: [...scanResult.files]
    };
  }

  /**
   * Find files matching specific names in the index
   */
  findFilesByNames(index: FileIndex, names: string[]): FileInfo[] {
    const results: FileInfo[] = [];
    const nameSet = new Set(names);

    for (const [name, files] of index.byName.entries()) {
      if (nameSet.has(name)) {
        results.push(...files);
      }
    }

    return results;
  }

  /**
   * Find files in a specific directory
   */
  findFilesInDirectory(index: FileIndex, directory: string): FileInfo[] {
    return index.byDirectory.get(path.resolve(directory)) || [];
  }

  /**
   * Find files at a specific depth
   */
  findFilesAtDepth(index: FileIndex, depth: number): FileInfo[] {
    return index.byDepth.get(depth) || [];
  }

  /**
   * Get files sorted by priority (depth first, then name priority)
   */
  getFilesByPriority(index: FileIndex, nameHierarchy: string[]): FileInfo[] {
    const nameToIndex = new Map<string, number>();
    
    // Create priority mapping
    nameHierarchy.forEach((name, index) => {
      nameToIndex.set(name, index);
    });

    // Sort all files by depth, then by name priority
    const sorted = [...index.all].sort((a, b) => {
      // First by depth (shallower first)
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }
      
      // Then by name priority
      const priorityA = nameToIndex.get(a.name) ?? Number.MAX_SAFE_INTEGER;
      const priorityB = nameToIndex.get(b.name) ?? Number.MAX_SAFE_INTEGER;
      
      return priorityA - priorityB;
    });

    return sorted;
  }

  /**
   * Create FileInfo object from file path
   */
  private async createFileInfo(
    filePath: string,
    rootDir: string,
    depth: number,
    options: ScanOptions
  ): Promise<FileInfo | null> {
    try {
      // Skip if gitignored
      if (options.fileService?.shouldGitIgnoreFile(filePath)) {
        return null;
      }

      const stats = await fs.stat(filePath);
      const resolvedPath = path.resolve(filePath);
      const resolvedRoot = path.resolve(rootDir);

      return {
        path: resolvedPath,
        name: path.basename(resolvedPath),
        directory: path.dirname(resolvedPath),
        relativePath: path.relative(resolvedRoot, resolvedPath),
        lastModified: stats.mtime.getTime(),
        size: stats.size,
        depth
      };
    } catch (error) {
      this.logger.debug(`Could not process file ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Check if a directory should be ignored
   */
  private shouldIgnoreDirectory(dir: string, ignorePatterns: string[]): boolean {
    const basename = path.basename(dir);
    
    return ignorePatterns.some(pattern => {
      // Simple pattern matching for now
      if (pattern.includes('*')) {
        // Convert glob pattern to regex
        const regexPattern = pattern.replace(/\*/g, '.*');
        return new RegExp(regexPattern).test(basename);
      }
      
      return basename === pattern;
    });
  }
}

/**
 * Optimized scanner for context files specifically
 */
export class ContextFileScanner extends DirectoryScanner {
  /**
   * Scan for context files with optimized settings
   */
  async scanForContextFiles(
    rootDir: string,
    contextHierarchy: string[],
    options: Partial<ScanOptions> = {}
  ): Promise<{ index: FileIndex; scanResult: ScanResult }> {
    // Optimized defaults for context file scanning
    const scanOptions: ScanOptions = {
      maxDepth: 10,
      maxDirs: 100,
      ignorePatterns: [
        'node_modules',
        '.git',
        'dist',
        'build',
        '.next',
        'coverage',
        ...options.ignorePatterns || []
      ],
      ...options
    };

    const scanResult = await this.scanDirectory(rootDir, scanOptions);
    const index = this.buildFileIndex(scanResult);

    return { index, scanResult };
  }

  /**
   * Find context files in priority order
   */
  findContextFiles(
    index: FileIndex,
    contextHierarchy: string[]
  ): Map<string, FileInfo> {
    const results = new Map<string, FileInfo>();
    
    // Group files by directory
    for (const [directory, files] of index.byDirectory.entries()) {
      // Find the highest priority context file in this directory
      let bestFile: FileInfo | null = null;
      let bestPriority = Number.MAX_SAFE_INTEGER;
      
      for (const file of files) {
        const priority = contextHierarchy.indexOf(file.name);
        if (priority !== -1 && priority < bestPriority) {
          bestFile = file;
          bestPriority = priority;
        }
      }
      
      if (bestFile) {
        results.set(directory, bestFile);
      }
    }
    
    return results;
  }
}