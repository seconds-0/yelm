/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context7Wrapper } from '../tools/context7Wrapper.js';
import { ProjectTypeDetector } from './projectTypeDetector.js';

export interface DocumentationContext {
  file?: string;
  library?: string;
  documentation?: string;
  source: 'context7' | 'none';
}

export class DocumentationContextProvider {
  private context7: Context7Wrapper;
  private projectDetector: ProjectTypeDetector;
  private cache: Map<string, DocumentationContext> = new Map();

  constructor() {
    this.context7 = new Context7Wrapper();
    this.projectDetector = new ProjectTypeDetector();
  }


  /**
   * Detect file mentions in a prompt and add relevant documentation
   */
  async getDocumentationForPrompt(
    prompt: string,
    projectPath: string
  ): Promise<DocumentationContext | null> {
    // Pattern to detect file mentions
    const filePattern = /\b(?:src\/|components\/|pages\/|lib\/|utils\/)?[\w-]+\.(tsx?|jsx?|vue|py|rb|java|go)\b/gi;
    const matches = prompt.match(filePattern);
    
    if (!matches || matches.length === 0) {
      return null;
    }

    // Take the first mentioned file
    const mentionedFile = matches[0];
    
    // Check cache first
    const cacheKey = `${projectPath}:${mentionedFile}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Determine library based on file extension and project type
    const library = await this.determineLibrary(mentionedFile, projectPath);
    
    if (!library) {
      return null;
    }

    // Look up documentation
    try {
      const result = await this.context7.lookup({
        libraryName: library,
        topic: this.getTopicFromFile(mentionedFile),
        timeout: 3000
      });

      if (result.success && result.documentation) {
        const context: DocumentationContext = {
          file: mentionedFile,
          library,
          documentation: result.documentation,
          source: 'context7'
        };
        
        // Cache for 5 minutes
        this.cache.set(cacheKey, context);
        setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
        
        return context;
      }
    } catch {
      // Graceful degradation - continue without documentation
    }

    return null;
  }

  /**
   * Determine which library documentation to fetch based on file and project
   */
  private async determineLibrary(file: string, projectPath: string): Promise<string | null> {
    const ext = file.split('.').pop()?.toLowerCase();
    
    // Get project context to make better decisions
    const projectContext = await this.projectDetector.getProjectContext(projectPath);
    
    // React/Next.js files
    if ((ext === 'tsx' || ext === 'jsx') && projectContext.framework) {
      if (projectContext.framework === 'next') {
        return 'next';
      }
      if (projectContext.framework === 'react') {
        return 'react';
      }
    }
    
    // Vue files
    if (ext === 'vue' || (projectContext.framework === 'vue' && (ext === 'ts' || ext === 'js'))) {
      return 'vue';
    }
    
    // Angular files
    if (projectContext.framework === 'angular' && (ext === 'ts' || ext === 'js')) {
      return 'angular';
    }
    
    // Python files
    if (ext === 'py') {
      // Could check for Django, Flask, etc. in dependencies
      return null; // For now, skip Python
    }
    
    return null;
  }

  /**
   * Extract a relevant topic from the file name
   */
  private getTopicFromFile(file: string): string | undefined {
    const fileName = file.split('/').pop()?.split('.')[0]?.toLowerCase();
    
    if (!fileName) return undefined;
    
    // Common patterns to topics
    if (fileName.includes('hook') || fileName.includes('use')) {
      return 'hooks';
    }
    if (fileName.includes('component') || fileName.includes('button') || fileName.includes('card')) {
      return 'components';
    }
    if (fileName.includes('route') || fileName.includes('page')) {
      return 'routing';
    }
    if (fileName.includes('service') || fileName.includes('api')) {
      return 'services';
    }
    if (fileName.includes('directive')) {
      return 'directives';
    }
    
    return undefined;
  }

}