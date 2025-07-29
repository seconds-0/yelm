/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseTool, ToolResult } from './tools.js';
import { Type } from '@google/genai';
import { SchemaValidator } from '../utils/schemaValidator.js';
import { Context7Wrapper, Context7Options } from './context7Wrapper.js';
import { Config } from '../config/config.js';

/**
 * Parameters for the Context7 documentation tool
 */
export interface Context7ToolParams {
  /**
   * The library/framework name to get documentation for (e.g., 'react', 'vue', 'angular', 'next')
   */
  libraryName: string;

  /**
   * Optional topic within the library (e.g., 'hooks', 'components', 'routing', 'services')
   */
  topic?: string;

  /**
   * Maximum number of tokens of documentation to retrieve (default: 10000)
   */
  tokens?: number;
}

/**
 * Result from Context7 documentation lookup
 */
export type Context7ToolResult = ToolResult;

/**
 * A tool to fetch documentation from Context7 for libraries and frameworks
 */
export class Context7Tool extends BaseTool<Context7ToolParams, Context7ToolResult> {
  static readonly Name: string = 'context7_docs';
  private context7: Context7Wrapper;

  constructor(private readonly config: Config) {
    super(
      Context7Tool.Name,
      'Context7 Documentation',
      `Fetches up-to-date documentation for libraries and frameworks using Context7.
      
This tool helps you get relevant documentation when working with specific libraries or frameworks.
Common libraries include: react, vue, angular, next, express, django, flask, rails, etc.

Examples:
- Get React hooks documentation: { "libraryName": "react", "topic": "hooks" }
- Get Vue composition API docs: { "libraryName": "vue", "topic": "composition" }
- Get general Angular docs: { "libraryName": "angular" }`,
      {
        type: Type.OBJECT,
        properties: {
          libraryName: {
            type: Type.STRING,
            description: 'The library/framework name (e.g., react, vue, angular, next)',
          },
          topic: {
            type: Type.STRING,
            description: 'Optional topic within the library (e.g., hooks, components, routing)',
            nullable: true,
          },
          tokens: {
            type: Type.NUMBER,
            description: 'Maximum number of tokens to retrieve (default: 10000)',
            nullable: true,
          },
        },
        required: ['libraryName'],
      },
      true, // isOutputMarkdown - documentation is markdown
      false, // canUpdateOutput
    );
    this.context7 = new Context7Wrapper();
  }

  /**
   * Validates the parameters for the Context7Tool
   */
  validateToolParams(params: Context7ToolParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    if (!params.libraryName || params.libraryName.trim() === '') {
      return "The 'libraryName' parameter cannot be empty.";
    }

    if (params.tokens && (params.tokens < 100 || params.tokens > 50000)) {
      return "The 'tokens' parameter must be between 100 and 50000.";
    }

    return null;
  }

  /**
   * Gets a description of what the tool will do
   */
  getDescription(params: Context7ToolParams): string {
    let desc = `Fetching documentation for ${params.libraryName}`;
    if (params.topic) {
      desc += ` (topic: ${params.topic})`;
    }
    return desc;
  }

  /**
   * Determines if the tool should prompt for confirmation
   * Context7 lookups are read-only and safe, so no confirmation needed
   */
  async shouldConfirmExecute(): Promise<false> {
    return false;
  }

  /**
   * Executes the Context7 documentation lookup
   */
  async execute(
    params: Context7ToolParams,
    signal: AbortSignal,
  ): Promise<Context7ToolResult> {
    const validation = this.validateToolParams(params);
    if (validation) {
      return {
        summary: `Failed to fetch documentation: ${validation}`,
        llmContent: [{ text: `Error: ${validation}` }],
        returnDisplay: `❌ Error: ${validation}`,
      };
    }

    try {
      // Check if operation was aborted
      if (signal.aborted) {
        return {
          summary: 'Operation was aborted',
          llmContent: [{ text: 'Documentation lookup was aborted.' }],
          returnDisplay: '⏹️ Operation aborted',
        };
      }

      // Create options for Context7Wrapper
      const options: Context7Options = {
        libraryName: params.libraryName,
        topic: params.topic,
        tokens: params.tokens,
        timeout: 3000, // 3 second timeout
        debug: this.config.getDebugMode(), // Pass debug mode from config
      };

      // Call Context7Wrapper
      const result = await this.context7.lookup(options);

      // Check if operation was aborted during lookup
      if (signal.aborted) {
        return {
          summary: 'Operation was aborted',
          llmContent: [{ text: 'Documentation lookup was aborted.' }],
          returnDisplay: '⏹️ Operation aborted',
        };
      }

      // Return the result
      if (result.success) {
        const topicDesc = result.topic ? ` (${result.topic})` : '';
        const summary = `Fetched ${result.library}${topicDesc} documentation`;
        
        // Create structured content for LLM
        const llmText = `Context7 Documentation for ${result.library}${topicDesc}:\n\n${result.documentation}`;
        
        // Create display for user
        const display = `## ${result.library} Documentation${topicDesc}\n\n${result.documentation}`;
        
        return {
          summary,
          llmContent: [{ text: llmText }],
          returnDisplay: display,
        };
      } else {
        const errorMsg = result.error || 'Failed to fetch documentation';
        return {
          summary: `Failed to fetch documentation: ${errorMsg}`,
          llmContent: [{ text: `Error fetching documentation: ${errorMsg}` }],
          returnDisplay: `❌ Error: ${errorMsg}`,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        summary: `Failed to fetch documentation: ${errorMsg}`,
        llmContent: [{ text: `Error fetching documentation: ${errorMsg}` }],
        returnDisplay: `❌ Error: ${errorMsg}`,
      };
    }
  }
}