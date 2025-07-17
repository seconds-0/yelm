/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';

/**
 * Configuration for a context file pattern
 */
export interface ContextFilePattern {
  /** The pattern/name used in configuration */
  pattern: string;
  /** Whether this pattern has special path handling */
  hasSpecialPath: boolean;
  /** Function to resolve the actual file path */
  resolvePath: (directory: string) => string;
  /** Priority order (lower number = higher priority) */
  priority: number;
}

/**
 * Standard context file patterns with their path resolution strategies
 */
export const STANDARD_CONTEXT_PATTERNS: Record<string, ContextFilePattern> = {
  'agents.md': {
    pattern: 'agents.md',
    hasSpecialPath: false,
    resolvePath: (directory: string) => path.join(directory, 'agents.md'),
    priority: 1
  },
  'CLAUDE.md': {
    pattern: 'CLAUDE.md',
    hasSpecialPath: false,
    resolvePath: (directory: string) => path.join(directory, 'CLAUDE.md'),
    priority: 2
  },
  'GEMINI.md': {
    pattern: 'GEMINI.md',
    hasSpecialPath: false,
    resolvePath: (directory: string) => path.join(directory, 'GEMINI.md'),
    priority: 3
  },
  '.cursor/rules': {
    pattern: '.cursor/rules',
    hasSpecialPath: true,
    resolvePath: (directory: string) => path.join(directory, '.cursor', 'rules'),
    priority: 4
  }
};

/**
 * Default context file hierarchy in priority order
 */
export const DEFAULT_CONTEXT_HIERARCHY = [
  'agents.md',
  'CLAUDE.md', 
  'GEMINI.md',
  '.cursor/rules'
];

/**
 * Resolve the actual file path for a context file pattern
 */
export function resolveContextFilePath(pattern: string, directory: string): string {
  const patternConfig = STANDARD_CONTEXT_PATTERNS[pattern];
  if (!patternConfig) {
    // For unknown patterns, assume they're regular files
    return path.join(directory, pattern);
  }
  
  return patternConfig.resolvePath(directory);
}

/**
 * Check if a pattern has special path handling
 */
export function hasSpecialPathHandling(pattern: string): boolean {
  const patternConfig = STANDARD_CONTEXT_PATTERNS[pattern];
  return patternConfig?.hasSpecialPath || false;
}

/**
 * Get the priority for a context file pattern
 */
export function getPatternPriority(pattern: string): number {
  const patternConfig = STANDARD_CONTEXT_PATTERNS[pattern];
  return patternConfig?.priority || 999;
}

/**
 * Validate a context file hierarchy
 */
export function validateContextHierarchy(hierarchy: string[]): void {
  const allowedSpecialPaths = Object.keys(STANDARD_CONTEXT_PATTERNS).filter(
    key => STANDARD_CONTEXT_PATTERNS[key].hasSpecialPath
  );
  
  for (const entry of hierarchy) {
    // Check for path separators
    if (entry.includes('..')) {
      throw new Error(`Invalid hierarchy entry: ${entry} (contains relative path)`);
    }
    
    // Allow special paths that we know about
    if (entry.includes('/') && !allowedSpecialPaths.includes(entry)) {
      throw new Error(`Invalid hierarchy entry: ${entry} (contains path separator)`);
    }
  }
}

/**
 * Sort hierarchy entries by priority
 */
export function sortHierarchyByPriority(hierarchy: string[]): string[] {
  return [...hierarchy].sort((a, b) => {
    const priorityA = getPatternPriority(a);
    const priorityB = getPatternPriority(b);
    return priorityA - priorityB;
  });
}