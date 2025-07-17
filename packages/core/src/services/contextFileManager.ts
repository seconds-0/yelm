/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  ContextFileDiscovery, 
  ContextFileResult, 
  DiscoveryOptions,
  ContextFileError 
} from './contextFileDiscovery.js';
import { ContextConfig, ContextSettings } from './contextConfig.js';
import { FileDiscoveryService } from './fileDiscoveryService.js';

/**
 * Result of loading context files
 */
export interface ContextLoadResult {
  /** Combined content from all context files */
  content: string;
  /** Number of files loaded */
  fileCount: number;
  /** List of loaded files with metadata */
  files: ContextFileResult[];
  /** Names of the context files for display */
  fileNames: string[];
}

/**
 * Options for loading context files
 */
export interface LoadOptions {
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
 * High-level manager for context file operations
 */
export class ContextFileManager {
  private discovery: ContextFileDiscovery;
  private config: ContextConfig;

  constructor(
    userSettings: ContextSettings = {},
    environment?: 'test' | 'development' | 'production'
  ) {
    this.config = environment 
      ? ContextConfig.forEnvironment(environment, userSettings)
      : new ContextConfig(userSettings);
    
    this.discovery = new ContextFileDiscovery(
      this.config.getConfig(),
      this.config.getEnvironment().isDebug
    );
  }

  /**
   * Load and concatenate context files
   */
  async loadContextFiles(options: LoadOptions): Promise<ContextLoadResult> {
    const { workingDir, debug = false, extensionContextFiles = [], fileService } = options;
    
    try {
      // Discover context files
      const discoveryOptions: DiscoveryOptions = {
        workingDir,
        debug,
        extensionContextFiles
      };
      
      const files = await this.discovery.discover(discoveryOptions);
      
      if (files.length === 0) {
        return {
          content: '',
          fileCount: 0,
          files: [],
          fileNames: []
        };
      }

      // Read and process files
      const processedFiles = await this.readAndProcessFiles(files, workingDir, fileService);
      
      // Combine content
      const content = this.combineFileContents(processedFiles, workingDir);
      
      // Extract file names for display
      const fileNames = this.extractFileNames(processedFiles);
      
      return {
        content,
        fileCount: processedFiles.length,
        files: processedFiles,
        fileNames
      };
      
    } catch (error) {
      if (error instanceof ContextFileError) {
        throw error;
      }
      throw new ContextFileError(
        `Failed to load context files: ${error instanceof Error ? error.message : String(error)}`,
        'LOAD_FAILED'
      );
    }
  }

  /**
   * Get configuration information
   */
  getConfig(): ContextConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(newSettings: ContextSettings): void {
    this.config.updateSettings(newSettings);
    this.discovery = new ContextFileDiscovery(
      this.config.getConfig(),
      this.config.getEnvironment().isDebug
    );
  }

  /**
   * Clear discovery cache
   */
  clearCache(): void {
    this.discovery.clearCache();
  }

  /**
   * Find context files without loading content
   */
  async findContextFiles(workingDir: string, debug = false): Promise<ContextFileResult[]> {
    return this.discovery.discover({ workingDir, debug });
  }

  /**
   * Check if context files exist in a directory
   */
  async hasContextFiles(directory: string): Promise<boolean> {
    const result = await this.discovery.findInDirectory(directory);
    return result !== null;
  }

  /**
   * Read and process discovered files
   */
  private async readAndProcessFiles(
    files: ContextFileResult[],
    workingDir: string,
    fileService?: FileDiscoveryService
  ): Promise<Array<ContextFileResult & { content: string }>> {
    const processedFiles: Array<ContextFileResult & { content: string }> = [];
    
    for (const file of files) {
      try {
        // Check if file should be ignored by gitignore
        if (fileService?.shouldGitIgnoreFile(file.path)) {
          continue;
        }
        
        // Read file content
        const content = await fs.readFile(file.path, 'utf-8');
        
        // Process imports if needed (for future extension)
        const processedContent = await this.processFileContent(content, file.path, workingDir);
        
        // Add content to result
        processedFiles.push({
          ...file,
          content: processedContent
        } as ContextFileResult & { content: string });
        
      } catch (error) {
        // Log warning but continue with other files
        console.warn(`[ContextFileManager] Could not read file ${file.path}: ${error}`);
      }
    }
    
    return processedFiles;
  }

  /**
   * Process file content (placeholder for future import processing)
   */
  private async processFileContent(
    content: string,
    _filePath: string,
    _workingDir: string
  ): Promise<string> {
    // For now, just return content as-is
    // In the future, this could process imports, variables, etc.
    return content.trim();
  }

  /**
   * Combine content from multiple files
   */
  private combineFileContents(
    files: Array<ContextFileResult & { content: string }>,
    workingDir: string
  ): string {
    return files
      .filter(file => file.content && file.content.trim().length > 0)
      .map(file => {
        const displayPath = path.isAbsolute(file.path)
          ? path.relative(workingDir, file.path)
          : file.path;
        
        return `--- Context from: ${displayPath} ---\n${file.content}\n--- End of Context from: ${displayPath} ---`;
      })
      .join('\n\n');
  }

  /**
   * Extract file names for display purposes
   */
  private extractFileNames(files: ContextFileResult[]): string[] {
    const names = files.map(file => path.basename(file.path));
    return [...new Set(names)]; // Remove duplicates
  }
}

/**
 * Factory for creating context file managers
 */
export class ContextFileManagerFactory {
  /**
   * Create manager for CLI usage
   */
  static forCLI(userSettings: ContextSettings = {}): ContextFileManager {
    return new ContextFileManager(userSettings, 'production');
  }

  /**
   * Create manager for server usage
   */
  static forServer(userSettings: ContextSettings = {}): ContextFileManager {
    return new ContextFileManager(userSettings, 'production');
  }

  /**
   * Create manager for testing
   */
  static forTesting(userSettings: ContextSettings = {}): ContextFileManager {
    return new ContextFileManager(userSettings, 'test');
  }

  /**
   * Create manager from legacy configuration
   */
  static fromLegacyConfig(legacyFilenames: string | string[]): ContextFileManager {
    const config = ContextConfig.fromLegacySettings(legacyFilenames);
    return new ContextFileManager(config.getConfig());
  }
}

/**
 * Backward compatibility interface
 */
export interface LegacyMemoryResult {
  memoryContent: string;
  fileCount: number;
}

/**
 * Legacy compatibility wrapper
 */
export class LegacyContextManager {
  private manager: ContextFileManager;

  constructor(contextFilenames: string | string[] = 'agents.md') {
    this.manager = ContextFileManagerFactory.fromLegacyConfig(contextFilenames);
  }

  /**
   * Load hierarchical memory (legacy interface)
   */
  async loadHierarchicalMemory(
    currentWorkingDirectory: string,
    debugMode: boolean,
    fileService: FileDiscoveryService,
    extensionContextFilePaths: string[] = []
  ): Promise<LegacyMemoryResult> {
    const result = await this.manager.loadContextFiles({
      workingDir: currentWorkingDirectory,
      debug: debugMode,
      extensionContextFiles: extensionContextFilePaths,
      fileService
    });
    
    return {
      memoryContent: result.content,
      fileCount: result.fileCount
    };
  }
}