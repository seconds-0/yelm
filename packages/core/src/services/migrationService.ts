/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import { ContextFileError } from './contextFileDiscovery.js';

/**
 * Information about a legacy file that can be migrated
 */
export interface LegacyFile {
  /** Current path of the file */
  path: string;
  /** Recommended new name */
  suggestedName: string;
  /** Recommended new path */
  suggestedPath: string;
  /** Type of migration required */
  migrationType: 'rename' | 'move' | 'copy';
  /** Priority of this migration (lower = higher priority) */
  priority: number;
  /** Human-readable description of the migration */
  description: string;
}

/**
 * Migration plan for a set of legacy files
 */
export interface MigrationPlan {
  /** Files to be migrated */
  files: LegacyFile[];
  /** Whether migration can be automated */
  canAutoMigrate: boolean;
  /** Warning messages about the migration */
  warnings: string[];
  /** Summary of what will be changed */
  summary: string;
}

/**
 * Options for migration detection
 */
export interface MigrationOptions {
  /** Whether to scan recursively */
  recursive?: boolean;
  /** Maximum depth to scan */
  maxDepth?: number;
  /** Directories to scan */
  directories?: string[];
  /** Whether to include global directories */
  includeGlobal?: boolean;
}

/**
 * Result of migration execution
 */
export interface MigrationResult {
  /** Whether migration was successful */
  success: boolean;
  /** Files that were successfully migrated */
  migrated: string[];
  /** Files that failed to migrate */
  failed: Array<{ file: string; error: string }>;
  /** Summary of what was done */
  summary: string;
}

/**
 * Service for detecting and migrating legacy context files
 */
export class MigrationService {
  private readonly logger = {
    info: (message: string) => console.log(`[MigrationService] ${message}`),
    warn: (message: string) => console.warn(`[MigrationService] ${message}`),
    error: (message: string) => console.error(`[MigrationService] ${message}`),
    debug: (message: string) => this.debug && console.debug(`[MigrationService] ${message}`)
  };

  constructor(private readonly debug: boolean = false) {}

  /**
   * Detect legacy files that need migration
   */
  async detectLegacyFiles(workingDir: string, options: MigrationOptions = {}): Promise<LegacyFile[]> {
    const legacyFiles: LegacyFile[] = [];
    const {
      recursive = true,
      maxDepth = 10,
      directories = [workingDir],
      includeGlobal = true
    } = options;

    // Add global directories if requested
    const allDirectories = [...directories];
    if (includeGlobal) {
      allDirectories.push(
        path.join(homedir(), '.gemini'),
        path.join(homedir(), '.yelm')
      );
    }

    for (const dir of allDirectories) {
      try {
        const files = await this.scanDirectoryForLegacyFiles(dir, recursive, maxDepth, 0);
        legacyFiles.push(...files);
      } catch (error) {
        this.logger.debug(`Could not scan directory ${dir}: ${error}`);
      }
    }

    return legacyFiles;
  }

  /**
   * Create a migration plan for detected legacy files
   */
  suggestMigration(files: LegacyFile[]): MigrationPlan {
    const warnings: string[] = [];
    let canAutoMigrate = true;

    // Check for conflicts
    const targetPaths = new Set<string>();
    for (const file of files) {
      if (targetPaths.has(file.suggestedPath)) {
        warnings.push(`Multiple files would be migrated to ${file.suggestedPath}`);
        canAutoMigrate = false;
      }
      targetPaths.add(file.suggestedPath);
    }

    // Check if target files already exist
    for (const file of files) {
      try {
        // This is a sync check, but we'll make it async in practice
        const exists = this.fileExistsSync(file.suggestedPath);
        if (exists) {
          warnings.push(`Target file already exists: ${file.suggestedPath}`);
          canAutoMigrate = false;
        }
      } catch (error) {
        // File doesn't exist, which is good
      }
    }

    const summary = this.generateMigrationSummary(files);

    return {
      files,
      canAutoMigrate,
      warnings,
      summary
    };
  }

  /**
   * Check if automatic migration is possible
   */
  canAutoMigrate(plan: MigrationPlan): boolean {
    return plan.canAutoMigrate && plan.warnings.length === 0;
  }

  /**
   * Execute a migration plan
   */
  async executeMigration(plan: MigrationPlan, force: boolean = false): Promise<MigrationResult> {
    const migrated: string[] = [];
    const failed: Array<{ file: string; error: string }> = [];

    if (!plan.canAutoMigrate && !force) {
      return {
        success: false,
        migrated: [],
        failed: plan.files.map(f => ({ file: f.path, error: 'Migration requires manual intervention' })),
        summary: 'Migration aborted - requires manual intervention'
      };
    }

    for (const file of plan.files) {
      try {
        await this.migrateFile(file);
        migrated.push(file.path);
        this.logger.info(`Migrated: ${file.path} → ${file.suggestedPath}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push({ file: file.path, error: errorMessage });
        this.logger.error(`Failed to migrate ${file.path}: ${errorMessage}`);
      }
    }

    const success = failed.length === 0;
    const summary = `Migrated ${migrated.length} files, ${failed.length} failed`;

    return {
      success,
      migrated,
      failed,
      summary
    };
  }

  /**
   * Scan a directory for legacy files
   */
  private async scanDirectoryForLegacyFiles(
    dir: string,
    recursive: boolean,
    maxDepth: number,
    currentDepth: number
  ): Promise<LegacyFile[]> {
    const legacyFiles: LegacyFile[] = [];

    try {
      await fs.access(dir);
    } catch (error) {
      return legacyFiles; // Directory doesn't exist or isn't accessible
    }

    if (currentDepth > maxDepth) {
      return legacyFiles;
    }

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isFile()) {
          const legacyFile = this.checkForLegacyFile(fullPath);
          if (legacyFile) {
            legacyFiles.push(legacyFile);
          }
        } else if (entry.isDirectory() && recursive) {
          const subFiles = await this.scanDirectoryForLegacyFiles(
            fullPath,
            recursive,
            maxDepth,
            currentDepth + 1
          );
          legacyFiles.push(...subFiles);
        }
      }
    } catch (error) {
      this.logger.debug(`Could not read directory ${dir}: ${error}`);
    }

    return legacyFiles;
  }

  /**
   * Check if a file is a legacy file that needs migration
   */
  private checkForLegacyFile(filePath: string): LegacyFile | null {
    const fileName = path.basename(filePath);
    const directory = path.dirname(filePath);

    // Check for GEMINI.md files
    if (fileName === 'GEMINI.md') {
      return {
        path: filePath,
        suggestedName: 'agents.md',
        suggestedPath: path.join(directory, 'agents.md'),
        migrationType: 'rename',
        priority: 1,
        description: 'Rename GEMINI.md to agents.md for better AI assistant support'
      };
    }

    // Check for files in .gemini directory
    if (filePath.includes(path.join(homedir(), '.gemini'))) {
      const relativePath = path.relative(path.join(homedir(), '.gemini'), filePath);
      const newPath = path.join(homedir(), '.yelm', relativePath);
      
      return {
        path: filePath,
        suggestedName: fileName,
        suggestedPath: newPath,
        migrationType: 'move',
        priority: 2,
        description: 'Move file from .gemini to .yelm directory'
      };
    }

    return null;
  }

  /**
   * Migrate a single file
   */
  private async migrateFile(file: LegacyFile): Promise<void> {
    // Ensure target directory exists
    const targetDir = path.dirname(file.suggestedPath);
    await fs.mkdir(targetDir, { recursive: true });

    switch (file.migrationType) {
      case 'rename':
      case 'move':
        await fs.rename(file.path, file.suggestedPath);
        break;
      case 'copy':
        await fs.copyFile(file.path, file.suggestedPath);
        break;
      default:
        throw new ContextFileError(`Unknown migration type: ${file.migrationType}`, 'INVALID_MIGRATION');
    }
  }

  /**
   * Generate a human-readable summary of the migration
   */
  private generateMigrationSummary(files: LegacyFile[]): string {
    if (files.length === 0) {
      return 'No files need migration';
    }

    const groupedByType = new Map<string, number>();
    for (const file of files) {
      const count = groupedByType.get(file.migrationType) || 0;
      groupedByType.set(file.migrationType, count + 1);
    }

    const parts = [];
    for (const [type, count] of groupedByType.entries()) {
      parts.push(`${count} file${count > 1 ? 's' : ''} to ${type}`);
    }

    return `Migration will ${parts.join(', ')}`;
  }

  /**
   * Synchronously check if a file exists (for planning purposes)
   */
  private fileExistsSync(filePath: string): boolean {
    try {
      require('fs').accessSync(filePath, require('fs').constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Utility functions for migration
 */
export class MigrationUtils {
  /**
   * Check if a directory needs migration
   */
  static async directoryNeedsMigration(directory: string): Promise<boolean> {
    const service = new MigrationService();
    const legacyFiles = await service.detectLegacyFiles(directory, { recursive: false });
    return legacyFiles.length > 0;
  }

  /**
   * Get migration suggestions for a specific directory
   */
  static async getMigrationSuggestions(directory: string): Promise<string[]> {
    const service = new MigrationService();
    const legacyFiles = await service.detectLegacyFiles(directory, { recursive: false });
    return legacyFiles.map(file => file.description);
  }

  /**
   * Perform automatic migration if safe
   */
  static async autoMigrateIfSafe(directory: string): Promise<{ migrated: boolean; message: string }> {
    const service = new MigrationService();
    const legacyFiles = await service.detectLegacyFiles(directory, { recursive: false });
    
    if (legacyFiles.length === 0) {
      return { migrated: false, message: 'No files need migration' };
    }

    const plan = service.suggestMigration(legacyFiles);
    
    if (!service.canAutoMigrate(plan)) {
      return { 
        migrated: false, 
        message: `Migration requires manual intervention: ${plan.warnings.join(', ')}` 
      };
    }

    const result = await service.executeMigration(plan);
    return { 
      migrated: result.success, 
      message: result.summary 
    };
  }
}