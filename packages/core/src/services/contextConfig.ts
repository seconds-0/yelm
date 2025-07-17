/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import { ContextFileConfig, DEFAULT_CONTEXT_CONFIG, ConfigurationError } from './contextFileDiscovery.js';

/**
 * User-configurable context settings
 */
export interface ContextSettings {
  /** Custom context file hierarchy */
  hierarchy?: string[];
  /** Additional global directories to search */
  globalDirs?: string[];
  /** Maximum directory depth to scan */
  maxDepth?: number;
  /** Additional ignore patterns */
  ignorePatterns?: string[];
  /** Enable/disable caching */
  cacheEnabled?: boolean;
  /** Maximum directories to scan */
  maxDirs?: number;
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  /** Whether we're in test mode */
  isTest: boolean;
  /** Whether we're in debug mode */
  isDebug: boolean;
  /** User home directory */
  homeDir: string;
  /** Current working directory */
  workingDir: string;
}

/**
 * Configuration manager for context file discovery
 */
export class ContextConfig {
  private config: ContextFileConfig;
  private environment: EnvironmentConfig;

  constructor(
    userSettings: ContextSettings = {},
    environment?: Partial<EnvironmentConfig>
  ) {
    this.environment = {
      isTest: !!(process.env.VITEST || process.env.NODE_ENV?.includes('test')),
      isDebug: !!(process.env.DEBUG || process.env.NODE_ENV === 'development'),
      homeDir: process.env.HOME || process.env.USERPROFILE || '',
      workingDir: process.cwd(),
      ...environment
    };

    this.config = this.buildConfig(userSettings);
    this.validateConfig();
  }

  /**
   * Get the current configuration
   */
  getConfig(): ContextFileConfig {
    return { ...this.config }; // Return copy to prevent mutation
  }

  /**
   * Get environment information
   */
  getEnvironment(): EnvironmentConfig {
    return { ...this.environment };
  }

  /**
   * Update configuration with new settings
   */
  updateSettings(newSettings: ContextSettings): void {
    this.config = this.buildConfig(newSettings);
    this.validateConfig();
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONTEXT_CONFIG };
  }

  /**
   * Get configuration for a specific environment
   */
  static forEnvironment(env: 'test' | 'development' | 'production', userSettings: ContextSettings = {}): ContextConfig {
    const environmentConfig: Partial<EnvironmentConfig> = {
      isTest: env === 'test',
      isDebug: env === 'development'
    };

    // Environment-specific defaults
    let envDefaults: ContextSettings = {};
    
    switch (env) {
      case 'test':
        envDefaults = {
          cacheEnabled: false, // Disable caching in tests
          maxDirs: 50, // Limit scanning in tests
          maxDepth: 5
        };
        break;
      case 'development':
        envDefaults = {
          cacheEnabled: true,
          maxDirs: 100,
          maxDepth: 10
        };
        break;
      case 'production':
        envDefaults = {
          cacheEnabled: true,
          maxDirs: 200,
          maxDepth: 20
        };
        break;
      default:
        // Use production defaults for unknown environments
        envDefaults = {
          cacheEnabled: true,
          maxDirs: 200,
          maxDepth: 20
        };
        break;
    }

    return new ContextConfig({ ...envDefaults, ...userSettings }, environmentConfig);
  }

  /**
   * Create configuration from legacy settings
   */
  static fromLegacySettings(legacyFilenames: string | string[]): ContextConfig {
    const hierarchy = Array.isArray(legacyFilenames) ? legacyFilenames : [legacyFilenames];
    
    return new ContextConfig({
      hierarchy: [...hierarchy, ...DEFAULT_CONTEXT_CONFIG.hierarchy.filter(f => !hierarchy.includes(f))]
    });
  }

  /**
   * Build configuration from user settings
   */
  private buildConfig(userSettings: ContextSettings): ContextFileConfig {
    const config: ContextFileConfig = {
      hierarchy: userSettings.hierarchy || DEFAULT_CONTEXT_CONFIG.hierarchy,
      globalDirs: [
        ...(userSettings.globalDirs || []),
        ...DEFAULT_CONTEXT_CONFIG.globalDirs
      ],
      maxDepth: userSettings.maxDepth ?? DEFAULT_CONTEXT_CONFIG.maxDepth,
      ignorePatterns: [
        ...DEFAULT_CONTEXT_CONFIG.ignorePatterns,
        ...(userSettings.ignorePatterns || [])
      ],
      cacheEnabled: userSettings.cacheEnabled ?? DEFAULT_CONTEXT_CONFIG.cacheEnabled,
      maxDirs: userSettings.maxDirs ?? DEFAULT_CONTEXT_CONFIG.maxDirs
    };

    // Remove duplicates
    config.hierarchy = [...new Set(config.hierarchy)];
    config.globalDirs = [...new Set(config.globalDirs)];
    config.ignorePatterns = [...new Set(config.ignorePatterns)];

    return config;
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

    if (this.config.maxDepth < 1 || this.config.maxDepth > 50) {
      throw new ConfigurationError('Maximum depth must be between 1 and 50');
    }

    if (this.config.maxDirs < 1 || this.config.maxDirs > 1000) {
      throw new ConfigurationError('Maximum directories must be between 1 and 1000');
    }

    // Validate hierarchy entries
    for (const entry of this.config.hierarchy) {
      if (!entry || typeof entry !== 'string') {
        throw new ConfigurationError('Hierarchy entries must be non-empty strings');
      }
      
      // Allow .cursor/rules as a special case
      if (entry.includes('..') || (entry.includes('/') && entry !== '.cursor/rules')) {
        throw new ConfigurationError('Hierarchy entries cannot contain path separators (except .cursor/rules)');
      }
    }

    // Validate global directories
    for (const dir of this.config.globalDirs) {
      if (!dir || typeof dir !== 'string') {
        throw new ConfigurationError('Global directories must be non-empty strings');
      }
      
      if (dir.includes('..') || path.isAbsolute(dir)) {
        throw new ConfigurationError('Global directories must be relative paths');
      }
    }
  }
}

/**
 * Factory for creating context configurations
 */
export class ContextConfigFactory {
  /**
   * Create configuration for CLI usage
   */
  static forCLI(userSettings: ContextSettings = {}): ContextConfig {
    return new ContextConfig({
      cacheEnabled: true,
      maxDirs: 200,
      maxDepth: 20,
      ...userSettings
    });
  }

  /**
   * Create configuration for server usage
   */
  static forServer(userSettings: ContextSettings = {}): ContextConfig {
    return new ContextConfig({
      cacheEnabled: true,
      maxDirs: 500, // Servers can handle more
      maxDepth: 25,
      ...userSettings
    });
  }

  /**
   * Create configuration for testing
   */
  static forTesting(userSettings: ContextSettings = {}): ContextConfig {
    return new ContextConfig({
      cacheEnabled: false,
      maxDirs: 50,
      maxDepth: 5,
      ...userSettings
    }, {
      isTest: true,
      isDebug: false
    });
  }

  /**
   * Create configuration with performance optimizations
   */
  static forPerformance(userSettings: ContextSettings = {}): ContextConfig {
    return new ContextConfig({
      cacheEnabled: true,
      maxDirs: 100, // Limit scanning for performance
      maxDepth: 10,
      ignorePatterns: [
        ...DEFAULT_CONTEXT_CONFIG.ignorePatterns,
        '*.log',
        '*.tmp',
        'logs',
        'tmp'
      ],
      ...userSettings
    });
  }
}