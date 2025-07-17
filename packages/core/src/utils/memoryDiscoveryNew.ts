/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContextFileManager, ContextFileManagerFactory } from '../services/contextFileManager.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { ContextSettings } from '../services/contextConfig.js';
import { DEFAULT_CONTEXT_HIERARCHY } from '../services/contextFilePatterns.js';

/**
 * Unified memory discovery interface that replaces the old dual-mode system
 */
export class UnifiedMemoryDiscovery {
  private manager: ContextFileManager;

  constructor(userSettings: ContextSettings = {}) {
    this.manager = ContextFileManagerFactory.forServer(userSettings);
  }

  /**
   * Load hierarchical context files (unified approach)
   */
  async loadServerHierarchicalMemory(
    currentWorkingDirectory: string,
    debugMode: boolean,
    fileService: FileDiscoveryService,
    extensionContextFilePaths: string[] = []
  ): Promise<{ memoryContent: string; fileCount: number }> {
    try {
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
    } catch (error) {
      // Log error but return empty result to maintain backward compatibility
      console.error(`[UnifiedMemoryDiscovery] Failed to load context files: ${error}`);
      return {
        memoryContent: '',
        fileCount: 0
      };
    }
  }

  /**
   * Clear discovery cache
   */
  clearCache(): void {
    this.manager.clearCache();
  }

  /**
   * Update configuration
   */
  updateSettings(settings: ContextSettings): void {
    this.manager.updateConfig(settings);
  }
}

/**
 * Factory function for creating unified memory discovery
 */
export function createUnifiedMemoryDiscovery(userSettings: ContextSettings = {}): UnifiedMemoryDiscovery {
  return new UnifiedMemoryDiscovery(userSettings);
}

/**
 * Backward compatibility function - replaces the old loadServerHierarchicalMemory
 */
export async function loadServerHierarchicalMemory(
  currentWorkingDirectory: string,
  debugMode: boolean,
  fileService: FileDiscoveryService,
  extensionContextFilePaths: string[] = []
): Promise<{ memoryContent: string; fileCount: number }> {
  const discovery = createUnifiedMemoryDiscovery();
  return discovery.loadServerHierarchicalMemory(
    currentWorkingDirectory,
    debugMode,
    fileService,
    extensionContextFilePaths
  );
}

/**
 * Legacy compatibility for the old memory discovery system
 */
export class LegacyMemoryDiscoveryAdapter {
  private discovery: UnifiedMemoryDiscovery;

  constructor(legacyFilenames: string | string[] = ['agents.md']) {
    // Convert legacy filenames to new hierarchy
    const hierarchy = Array.isArray(legacyFilenames) ? legacyFilenames : [legacyFilenames];
    
    this.discovery = createUnifiedMemoryDiscovery({
      hierarchy: [...hierarchy, ...DEFAULT_CONTEXT_HIERARCHY.slice(1)] // Skip 'agents.md' as it's already in hierarchy
    });
  }

  /**
   * Load hierarchical memory with legacy interface
   */
  async loadServerHierarchicalMemory(
    currentWorkingDirectory: string,
    debugMode: boolean,
    fileService: FileDiscoveryService,
    extensionContextFilePaths: string[] = []
  ): Promise<{ memoryContent: string; fileCount: number }> {
    return this.discovery.loadServerHierarchicalMemory(
      currentWorkingDirectory,
      debugMode,
      fileService,
      extensionContextFilePaths
    );
  }
}

/**
 * Default instance for backward compatibility
 */
export const defaultMemoryDiscovery = createUnifiedMemoryDiscovery();