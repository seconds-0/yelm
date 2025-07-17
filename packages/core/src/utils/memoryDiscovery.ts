/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { bfsFileSearch } from './bfsFileSearch.js';
import {
  GEMINI_CONFIG_DIR,
  YELM_CONFIG_DIR,
  CONTEXT_FILE_HIERARCHY,
  getCurrentContextFilename,
} from '../tools/memoryTool.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { processImports } from './memoryImportProcessor.js';

// Simple console logger, similar to the one previously in CLI's config.ts
// TODO: Integrate with a more robust server-side logger if available/appropriate.
const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...args: any[]) =>
    console.debug('[DEBUG] [MemoryDiscovery]', ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...args: any[]) => console.warn('[WARN] [MemoryDiscovery]', ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...args: any[]) =>
    console.error('[ERROR] [MemoryDiscovery]', ...args),
};

const MAX_DIRECTORIES_TO_SCAN_FOR_MEMORY = 200;

interface GeminiFileContent {
  filePath: string;
  content: string | null;
}

/**
 * Searches for context files in a directory based on the hierarchy.
 * Returns the first file found in the hierarchy, or null if none found.
 */
async function findContextFileInDirectory(
  directory: string,
  debugMode: boolean,
): Promise<string | null> {
  // Create effective hierarchy: custom filename first, then standard hierarchy
  const customFilename = getCurrentContextFilename();
  const effectiveHierarchy = [...CONTEXT_FILE_HIERARCHY];
  
  // If there's a custom filename and it's not already in the hierarchy, add it to the front
  if (customFilename && !effectiveHierarchy.includes(customFilename)) {
    effectiveHierarchy.unshift(customFilename);
  }
  
  // First check for standard context files (excluding .cursor/rules)
  for (const filename of effectiveHierarchy.slice(0, -1)) {
    const filePath = path.join(directory, filename);
    try {
      await fs.access(filePath, fsSync.constants.R_OK);
      if (debugMode) {
        logger.debug(`Found context file: ${filePath}`);
      }
      
      // Log migration suggestion for GEMINI.md files
      if (filename === 'GEMINI.md' && !process.env.VITEST) {
        logger.warn(`Found GEMINI.md at ${filePath}. Consider renaming to agents.md for better AI assistant support.`);
      }
      
      return filePath;
    } catch {
      // File doesn't exist or isn't readable, continue to next
    }
  }
  
  // Special handling for .cursor/rules (last in hierarchy)
  const cursorRulesPath = path.join(directory, '.cursor', 'rules');
  try {
    await fs.access(cursorRulesPath, fsSync.constants.R_OK);
    if (debugMode) {
      logger.debug(`Found .cursor/rules file: ${cursorRulesPath}`);
    }
    return cursorRulesPath;
  } catch {
    // File doesn't exist or isn't readable
  }
  
  return null;
}

async function findProjectRoot(startDir: string): Promise<string | null> {
  let currentDir = path.resolve(startDir);
  while (true) {
    const gitPath = path.join(currentDir, '.git');
    try {
      const stats = await fs.stat(gitPath);
      if (stats.isDirectory()) {
        return currentDir;
      }
    } catch (error: unknown) {
      // Don't log ENOENT errors as they're expected when .git doesn't exist
      // Also don't log errors in test environments, which often have mocked fs
      const isENOENT =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'ENOENT';

      // Only log unexpected errors in non-test environments
      // process.env.NODE_ENV === 'test' or VITEST are common test indicators
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST;

      if (!isENOENT && !isTestEnv) {
        if (typeof error === 'object' && error !== null && 'code' in error) {
          const fsError = error as { code: string; message: string };
          logger.warn(
            `Error checking for .git directory at ${gitPath}: ${fsError.message}`,
          );
        } else {
          logger.warn(
            `Non-standard error checking for .git directory at ${gitPath}: ${String(error)}`,
          );
        }
      }
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * Gets context file paths using the new hierarchy system.
 * Each directory contributes at most one context file (the highest priority one found).
 */
async function getContextFilePathsHierarchy(
  currentWorkingDirectory: string,
  userHomePath: string,
  debugMode: boolean,
  fileService: FileDiscoveryService,
  extensionContextFilePaths: string[] = [],
): Promise<string[]> {
  const allPaths = new Set<string>();
  const resolvedCwd = path.resolve(currentWorkingDirectory);
  const resolvedHome = path.resolve(userHomePath);

  // Create effective hierarchy: custom filename first, then standard hierarchy
  const customFilename = getCurrentContextFilename();
  const effectiveHierarchy = [...CONTEXT_FILE_HIERARCHY];
  
  // If there's a custom filename and it's not already in the hierarchy, add it to the front
  if (customFilename && !effectiveHierarchy.includes(customFilename)) {
    effectiveHierarchy.unshift(customFilename);
  }

  if (debugMode) {
    logger.debug(`Searching for context files using hierarchy: ${effectiveHierarchy.join(', ')}`);
    logger.debug(`Starting from CWD: ${resolvedCwd}`);
    logger.debug(`User home directory: ${resolvedHome}`);
  }

  // 1. Check global config directories (prefer .yelm over .gemini)
  const yelmConfigDir = path.join(resolvedHome, YELM_CONFIG_DIR);
  const geminiConfigDir = path.join(resolvedHome, GEMINI_CONFIG_DIR);
  
  let globalContextFile = await findContextFileInDirectory(yelmConfigDir, debugMode);
  if (!globalContextFile) {
    globalContextFile = await findContextFileInDirectory(geminiConfigDir, debugMode);
  }
  
  if (globalContextFile) {
    allPaths.add(globalContextFile);
  }

  // 2. Find project root
  const projectRoot = await findProjectRoot(resolvedCwd);
  if (debugMode) {
    logger.debug(`Determined project root: ${projectRoot ?? 'None'}`);
  }

  // 3. Scan upward from CWD to project root (or home if no project root)
  const upwardPaths: string[] = [];
  let currentDir = resolvedCwd;
  const ultimateStopDir = projectRoot
    ? path.dirname(projectRoot)
    : path.dirname(resolvedHome);

  while (currentDir && currentDir !== path.dirname(currentDir)) {
    if (debugMode) {
      logger.debug(`Checking for context files in (upward scan): ${currentDir}`);
    }

    // Skip the global config directories during upward scan
    if (currentDir === yelmConfigDir || currentDir === geminiConfigDir) {
      if (debugMode) {
        logger.debug(`Upward scan reached global config dir, skipping: ${currentDir}`);
      }
      currentDir = path.dirname(currentDir);
      continue;
    }

    const contextFile = await findContextFileInDirectory(currentDir, debugMode);
    if (contextFile && contextFile !== globalContextFile) {
      upwardPaths.unshift(contextFile);
    }

    if (currentDir === ultimateStopDir) {
      if (debugMode) {
        logger.debug(`Reached ultimate stop directory for upward scan: ${currentDir}`);
      }
      break;
    }

    currentDir = path.dirname(currentDir);
  }

  upwardPaths.forEach((p) => allPaths.add(p));

  // 4. Scan downward from CWD
  // For downward scan, we'll search for each file type separately and collect unique paths
  const downwardPaths = new Set<string>();
  
  // Search for each context file type (except .cursor/rules which needs special handling)
  for (const filename of effectiveHierarchy.slice(0, -1)) {
    const foundPaths = await bfsFileSearch(resolvedCwd, {
      fileName: filename,
      maxDirs: MAX_DIRECTORIES_TO_SCAN_FOR_MEMORY,
      debug: debugMode,
      fileService,
    });
    
    for (const foundPath of foundPaths) {
      const dir = path.dirname(foundPath);
      // Only add if we haven't already found a context file in this directory
      if (!Array.from(downwardPaths).some(p => path.dirname(p) === dir) &&
          !Array.from(allPaths).some(p => path.dirname(p) === dir)) {
        downwardPaths.add(foundPath);
      }
    }
  }
  
  // Special search for .cursor/rules
  const cursorDirs = await bfsFileSearch(resolvedCwd, {
    fileName: 'rules',
    maxDirs: MAX_DIRECTORIES_TO_SCAN_FOR_MEMORY,
    debug: debugMode,
    fileService,
  });
  
  for (const rulesPath of cursorDirs) {
    // Check if it's actually in a .cursor directory
    const parentDir = path.dirname(rulesPath);
    if (path.basename(parentDir) === '.cursor') {
      const contextDir = path.dirname(parentDir);
      // Only add if we haven't already found a context file in this directory
      if (!Array.from(downwardPaths).some(p => path.dirname(path.dirname(p)) === contextDir) &&
          !Array.from(allPaths).some(p => path.dirname(path.dirname(p)) === contextDir)) {
        downwardPaths.add(rulesPath);
      }
    }
  }
  
  // Add all downward paths to the final set
  downwardPaths.forEach(p => allPaths.add(p));

  // 5. Add extension context file paths
  for (const extensionPath of extensionContextFilePaths) {
    allPaths.add(extensionPath);
  }

  const finalPaths = Array.from(allPaths);

  if (debugMode) {
    logger.debug(`Final ordered context file paths: ${JSON.stringify(finalPaths)}`);
  }

  return finalPaths;
}


/**
 * @deprecated Use ContextFileManager.readAndProcessFiles instead
 */
async function readGeminiMdFiles(
  filePaths: string[],
  debugMode: boolean,
): Promise<GeminiFileContent[]> {
  const results: GeminiFileContent[] = [];
  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Process imports in the content
      const processedContent = await processImports(
        content,
        path.dirname(filePath),
        debugMode,
      );

      results.push({ filePath, content: processedContent });
      if (debugMode)
        logger.debug(
          `Successfully read and processed imports: ${filePath} (Length: ${processedContent.length})`,
        );
    } catch (error: unknown) {
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST;
      if (!isTestEnv) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(
          `Warning: Could not read context file at ${filePath}. Error: ${message}`,
        );
      }
      results.push({ filePath, content: null }); // Still include it with null content
      if (debugMode) logger.debug(`Failed to read: ${filePath}`);
    }
  }
  return results;
}

/**
 * @deprecated Use ContextFileManager.combineFileContents instead
 */
function concatenateInstructions(
  instructionContents: GeminiFileContent[],
  // CWD is needed to resolve relative paths for display markers
  currentWorkingDirectoryForDisplay: string,
): string {
  return instructionContents
    .filter((item) => typeof item.content === 'string')
    .map((item) => {
      const trimmedContent = (item.content as string).trim();
      if (trimmedContent.length === 0) {
        return null;
      }
      const displayPath = path.isAbsolute(item.filePath)
        ? path.relative(currentWorkingDirectoryForDisplay, item.filePath)
        : item.filePath;
      return `--- Context from: ${displayPath} ---\n${trimmedContent}\n--- End of Context from: ${displayPath} ---`;
    })
    .filter((block): block is string => block !== null)
    .join('\n\n');
}

/**
 * Loads hierarchical context files and concatenates their content.
 * This function is intended for use by the server.
 * 
 * @deprecated Use UnifiedMemoryDiscovery from memoryDiscoveryNew.ts instead
 */
export async function loadServerHierarchicalMemory(
  currentWorkingDirectory: string,
  debugMode: boolean,
  fileService: FileDiscoveryService,
  extensionContextFilePaths: string[] = [],
): Promise<{ memoryContent: string; fileCount: number }> {
  // For backward compatibility, we need to use the older implementation during the transition
  // The new unified system will be integrated once tests are updated
  const filePaths = await getContextFilePathsHierarchy(
    currentWorkingDirectory,
    homedir(),
    debugMode,
    fileService,
    extensionContextFilePaths
  );

  if (filePaths.length === 0) {
    return { memoryContent: '', fileCount: 0 };
  }

  const geminiMdFiles = await readGeminiMdFiles(filePaths, debugMode);
  const memoryContent = concatenateInstructions(geminiMdFiles, currentWorkingDirectory);
  const fileCount = geminiMdFiles.filter(f => f.content !== null).length;

  return { memoryContent, fileCount };
}
