/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context7Tool, Context7ToolParams } from './context7-tool.js';
import { Config } from '../config/config.js';
import { Context7Wrapper } from './context7Wrapper.js';

// Mock the Context7Wrapper
vi.mock('./context7Wrapper.js', () => ({
  Context7Wrapper: vi.fn().mockImplementation(() => ({
    lookup: vi.fn(),
  })),
}));

describe('Context7Tool', () => {
  let tool: Context7Tool;
  let mockConfig: Config;
  let mockLookup: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {} as Config;
    tool = new Context7Tool(mockConfig);
    
    // Get the mock instance
    const mockWrapper = vi.mocked(Context7Wrapper).mock.results[0]?.value;
    mockLookup = mockWrapper?.lookup;
  });

  describe('validateToolParams', () => {
    it('should validate required libraryName', () => {
      const error = tool.validateToolParams({} as Context7ToolParams);
      expect(error).toContain('libraryName');
    });

    it('should validate empty libraryName', () => {
      const error = tool.validateToolParams({ libraryName: '' });
      expect(error).toBe("The 'libraryName' parameter cannot be empty.");
    });

    it('should validate tokens range', () => {
      const error1 = tool.validateToolParams({ libraryName: 'react', tokens: 50 });
      expect(error1).toBe("The 'tokens' parameter must be between 100 and 50000.");

      const error2 = tool.validateToolParams({ libraryName: 'react', tokens: 100000 });
      expect(error2).toBe("The 'tokens' parameter must be between 100 and 50000.");
    });

    it('should accept valid params', () => {
      const error = tool.validateToolParams({
        libraryName: 'react',
        topic: 'hooks',
        tokens: 5000,
      });
      expect(error).toBeNull();
    });
  });

  describe('getDescription', () => {
    it('should describe basic lookup', () => {
      const desc = tool.getDescription({ libraryName: 'react' });
      expect(desc).toBe('Fetching documentation for react');
    });

    it('should include topic in description', () => {
      const desc = tool.getDescription({ libraryName: 'vue', topic: 'composition' });
      expect(desc).toBe('Fetching documentation for vue (topic: composition)');
    });
  });

  describe('shouldConfirmExecute', () => {
    it('should not require confirmation', async () => {
      // shouldConfirmExecute is inherited from BaseTool and returns false by default
      // Access protected method for testing
      const baseTool = tool as unknown as {
        shouldConfirmExecute: (params: Context7ToolParams, signal: AbortSignal) => Promise<false>;
      };
      const result = await baseTool.shouldConfirmExecute(
        { libraryName: 'react' },
        new AbortController().signal
      );
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should handle validation errors', async () => {
      const result = await tool.execute(
        { libraryName: '' },
        new AbortController().signal
      );
      expect(result.summary).toContain('Failed to fetch documentation');
      const llmContent = result.llmContent as Array<{text: string}>;
      expect(llmContent[0].text).toContain("The 'libraryName' parameter cannot be empty.");
    });

    it('should handle successful lookup', async () => {
      mockLookup.mockResolvedValue({
        success: true,
        library: 'react',
        topic: 'hooks',
        documentation: 'React hooks documentation',
        timestamp: 123456789,
      });

      const result = await tool.execute(
        { libraryName: 'react', topic: 'hooks' },
        new AbortController().signal
      );

      expect(mockLookup).toHaveBeenCalledWith({
        libraryName: 'react',
        topic: 'hooks',
        timeout: 3000,
      });

      expect(result.summary).toBe('Fetched react (hooks) documentation');
      const llmContent = result.llmContent as Array<{text: string}>;
      expect(llmContent[0].text).toContain('Context7 Documentation for react (hooks)');
      expect(llmContent[0].text).toContain('React hooks documentation');
      expect(result.returnDisplay).toContain('## react Documentation (hooks)');
      expect(result.returnDisplay).toContain('React hooks documentation');
    });

    it('should handle lookup failures', async () => {
      mockLookup.mockResolvedValue({
        success: false,
        error: 'Documentation not found',
      });

      const result = await tool.execute(
        { libraryName: 'unknown' },
        new AbortController().signal
      );

      expect(result.summary).toBe('Failed to fetch documentation: Documentation not found');
      const llmContent = result.llmContent as Array<{text: string}>;
      expect(llmContent[0].text).toContain('Documentation not found');
    });

    it('should handle abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await tool.execute(
        { libraryName: 'react' },
        controller.signal
      );

      expect(result.summary).toBe('Operation was aborted');
      const llmContent = result.llmContent as Array<{text: string}>;
      expect(llmContent[0].text).toBe('Documentation lookup was aborted.');
    });

    it('should handle exceptions', async () => {
      mockLookup.mockRejectedValue(new Error('Network error'));

      const result = await tool.execute(
        { libraryName: 'react' },
        new AbortController().signal
      );

      expect(result.summary).toBe('Failed to fetch documentation: Network error');
      const llmContent = result.llmContent as Array<{text: string}>;
      expect(llmContent[0].text).toContain('Network error');
    });

    it('should pass tokens parameter', async () => {
      mockLookup.mockResolvedValue({
        success: true,
        documentation: 'Limited docs',
      });

      await tool.execute(
        { libraryName: 'angular', tokens: 5000 },
        new AbortController().signal
      );

      expect(mockLookup).toHaveBeenCalledWith({
        libraryName: 'angular',
        tokens: 5000,
        timeout: 3000,
      });
    });
  });

  describe('metadata', () => {
    it('should have correct name and display name', () => {
      expect(Context7Tool.Name).toBe('context7_docs');
      expect(tool.name).toBe('context7_docs');
      expect(tool.displayName).toBe('Context7 Documentation');
    });

    it('should have markdown output enabled', () => {
      expect(tool.isOutputMarkdown).toBe(true);
    });

    it('should not support streaming', () => {
      expect(tool.canUpdateOutput).toBe(false);
    });
  });
});