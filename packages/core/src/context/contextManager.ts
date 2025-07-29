/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectTypeDetector } from './projectTypeDetector.js';
import { RecentFilesDetector } from './recentFilesDetector.js';
import { DocumentationContextProvider } from './documentationContext.js';

export class ContextManager {
  private projectDetector: ProjectTypeDetector;
  private recentFilesDetector: RecentFilesDetector;
  private docProvider: DocumentationContextProvider;

  constructor() {
    this.projectDetector = new ProjectTypeDetector();
    this.recentFilesDetector = new RecentFilesDetector();
    this.docProvider = new DocumentationContextProvider();
  }

  /**
   * Initialize context for the current working directory
   * This should be called at CLI startup
   */
  async initializeContext(workingDir: string): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Get full project context (includes build tool)
      const context = await this.projectDetector.getProjectContext(workingDir);
      
      // Set environment variables for prompt generation
      if (context.framework) {
        process.env.YELM_PROJECT_TYPE = context.framework;
      } else {
        process.env.YELM_PROJECT_TYPE = 'null';
      }
      
      if (context.buildTool) {
        process.env.YELM_BUILD_TOOL = context.buildTool;
      } else {
        process.env.YELM_BUILD_TOOL = 'null';
      }

      // Get recent files
      const recentFiles = await this.recentFilesDetector.getRecentFiles(workingDir);
      if (recentFiles.length > 0) {
        process.env.YELM_RECENT_FILES = recentFiles.join(', ');
      } else {
        process.env.YELM_RECENT_FILES = 'null';
      }

      const duration = Date.now() - startTime;
      
      // Log only if it takes more than 100ms (our performance budget)
      if (duration > 100) {
        console.warn(`Context detection took ${duration}ms (target: <100ms)`);
      }
    } catch (error) {
      // Don't fail the CLI if context detection fails
      console.error('Failed to detect project context:', error);
      process.env.YELM_PROJECT_TYPE = 'null';
      process.env.YELM_BUILD_TOOL = 'null';
      process.env.YELM_RECENT_FILES = 'null';
    }
  }

  /**
   * Get the current project context
   */
  async getContext(workingDir: string) {
    return this.projectDetector.getProjectContext(workingDir);
  }

  /**
   * Get documentation context for a specific prompt
   * This should be called when processing user prompts
   */
  async getDocumentationForPrompt(prompt: string, workingDir: string): Promise<void> {
    try {
      const docContext = await this.docProvider.getDocumentationForPrompt(prompt, workingDir);
      
      if (docContext && docContext.documentation) {
        // Set environment variable for prompt enhancement
        process.env.YELM_DOC_CONTEXT = docContext.documentation;
        process.env.YELM_DOC_FILE = docContext.file;
        process.env.YELM_DOC_LIBRARY = docContext.library;
      } else {
        // Clear documentation context
        delete process.env.YELM_DOC_CONTEXT;
        delete process.env.YELM_DOC_FILE;
        delete process.env.YELM_DOC_LIBRARY;
      }
    } catch (error) {
      // Don't fail on documentation lookup errors
      console.error('Failed to get documentation context:', error);
      delete process.env.YELM_DOC_CONTEXT;
      delete process.env.YELM_DOC_FILE;
      delete process.env.YELM_DOC_LIBRARY;
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for now
  }
}