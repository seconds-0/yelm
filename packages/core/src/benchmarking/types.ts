/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BenchmarkTask {
  id: string;
  name: string;
  description: string;
  prompt: string;
  projectType: 'react' | 'vue' | 'angular' | 'node' | 'python';
  contextFiles?: string[];
  successCriteria: string[];
  expectedPatterns?: string[];
}

export interface BenchmarkResult {
  taskId: string;
  timestamp: number;
  duration: number;
  response: string;
  scores: {
    correctness: number;    // 0-1: Does it work?
    contextUsage: number;   // 0-1: Did it use context?
    codeQuality: number;    // 0-1: Best practices?
    performance: number;    // 0-1: Response time
    overall: number;        // Weighted average
  };
  contextUsed: string[];
  criteriaMetCount: number;
  totalCriteria: number;
  errors?: string[];
}

export interface BenchmarkConfig {
  outputDir: string;
  timeoutMs: number;
  maxRetries: number;
  verbose: boolean;
}

export interface BenchmarkComparison {
  baseline: BenchmarkResult;
  current: BenchmarkResult;
  improvement: {
    overall: number;      // Percentage improvement
    correctness: number;
    contextUsage: number;
    codeQuality: number;
    performance: number;
  };
  regressions: string[];
}

export interface BenchmarkSuite {
  name: string;
  version: string;
  timestamp: number;
  tasks: BenchmarkTask[];
  results: BenchmarkResult[];
  summary: {
    totalTasks: number;
    averageScore: number;
    averageDuration: number;
    successRate: number;
  };
}