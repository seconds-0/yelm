/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkTask, BenchmarkResult } from './types.js';

export class BenchmarkScorer {
  async scoreResponse(
    task: BenchmarkTask,
    response: string,
    duration: number
  ): Promise<BenchmarkResult['scores']> {
    const correctness = this.scoreCorrectness(task, response);
    const contextUsage = this.scoreContextUsage(task, response);
    const codeQuality = this.scoreCodeQuality(task, response);
    const performance = this.scorePerformance(duration);

    // Weighted average: correctness is most important
    const overall = (
      correctness * 0.4 +
      contextUsage * 0.3 +
      codeQuality * 0.2 +
      performance * 0.1
    );

    return {
      correctness,
      contextUsage,
      codeQuality,
      performance,
      overall
    };
  }

  private scoreCorrectness(task: BenchmarkTask, response: string): number {
    let score = 0.5; // Base score for any reasonable response

    // Check if response contains expected patterns
    if (task.expectedPatterns) {
      const patternMatches = task.expectedPatterns.filter(pattern => 
        response.includes(pattern)
      ).length;
      score += (patternMatches / task.expectedPatterns.length) * 0.3;
    }

    // Check success criteria
    const criteriaMatches = task.successCriteria.filter(criterion => {
      const keywords = this.extractKeywords(criterion);
      return keywords.every(keyword => 
        response.toLowerCase().includes(keyword.toLowerCase())
      );
    }).length;
    
    score += (criteriaMatches / task.successCriteria.length) * 0.2;

    return Math.min(score, 1.0);
  }

  private scoreContextUsage(task: BenchmarkTask, response: string): number {
    let score = 0.0;

    // Check for project type awareness
    if (response.match(/This is a \w+ project/i)) {
      score += 0.3;
    }

    // Check for build tool awareness
    if (response.match(/Uses \w+ for building/i)) {
      score += 0.2;
    }

    // Check for file context usage
    if (response.match(/Recently modified files:|Based on.*files/i)) {
      score += 0.2;
    }

    // Check for documentation context
    if (response.match(/According to.*documentation|Based on.*docs/i)) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  private scoreCodeQuality(task: BenchmarkTask, response: string): number {
    let score = 0.5; // Base score

    // Extract code blocks
    const codeBlocks = response.match(/```[\s\S]*?```/g) || [];
    
    if (codeBlocks.length === 0) {
      // No code in response when code was expected
      if (task.prompt.toLowerCase().includes('create') || 
          task.prompt.toLowerCase().includes('write')) {
        return 0.2;
      }
      return score;
    }

    // Check for TypeScript usage in TypeScript projects
    if (task.projectType === 'react' || task.projectType === 'angular') {
      if (response.includes('interface ') || response.includes(': string') || 
          response.includes(': number') || response.includes(': boolean')) {
        score += 0.2;
      }
    }

    // Check for proper imports
    if (response.match(/^import .* from/m)) {
      score += 0.1;
    }

    // Check for error handling
    if (response.includes('try') || response.includes('catch') || 
        response.includes('.catch(') || response.includes('error')) {
      score += 0.1;
    }

    // Check for comments or documentation
    if (response.includes('/**') || response.includes('//')) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private scorePerformance(duration: number): number {
    // Performance scoring based on response time
    if (duration < 2000) return 1.0;      // < 2s: Perfect
    if (duration < 5000) return 0.9;      // < 5s: Excellent
    if (duration < 10000) return 0.7;     // < 10s: Good
    if (duration < 20000) return 0.5;     // < 20s: Acceptable
    if (duration < 30000) return 0.3;     // < 30s: Slow
    return 0.1;                           // > 30s: Too slow
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['that', 'this', 'with', 'from', 'have', 'will', 'your', 'what'];
    return stopWords.includes(word);
  }
}