/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BenchmarkTask, BenchmarkResult, BenchmarkConfig, BenchmarkSuite } from './types.js';
import { BenchmarkScorer } from './scorer.js';

export class BenchmarkRunner {
  private config: BenchmarkConfig;
  private scorer: BenchmarkScorer;

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = {
      outputDir: join(process.cwd(), 'benchmark-results'),
      timeoutMs: 30000,
      maxRetries: 2,
      verbose: false,
      ...config
    };
    this.scorer = new BenchmarkScorer();
  }

  async runSuite(tasks: BenchmarkTask[], suiteName: string): Promise<BenchmarkSuite> {
    const startTime = Date.now();
    const results: BenchmarkResult[] = [];

    console.log(`🚀 Starting benchmark suite: ${suiteName}`);
    console.log(`📋 ${tasks.length} tasks to run\n`);

    for (const task of tasks) {
      console.log(`\n▶️  Running task: ${task.name}`);
      const result = await this.runTask(task);
      results.push(result);
      
      console.log(`✅ Completed with score: ${(result.scores.overall * 100).toFixed(1)}%`);
      if (this.config.verbose) {
        console.log(`   - Correctness: ${(result.scores.correctness * 100).toFixed(1)}%`);
        console.log(`   - Context Usage: ${(result.scores.contextUsage * 100).toFixed(1)}%`);
        console.log(`   - Code Quality: ${(result.scores.codeQuality * 100).toFixed(1)}%`);
        console.log(`   - Performance: ${(result.scores.performance * 100).toFixed(1)}%`);
      }
    }

    const suite: BenchmarkSuite = {
      name: suiteName,
      version: await this.getCliVersion(),
      timestamp: startTime,
      tasks,
      results,
      summary: this.calculateSummary(results)
    };

    await this.saveResults(suite);
    return suite;
  }

  async runTask(task: BenchmarkTask): Promise<BenchmarkResult> {
    const startTime = Date.now();
    let response = '';
    const errors: string[] = [];
    let retries = 0;

    while (retries <= this.config.maxRetries) {
      try {
        response = await this.executeCliCommand(task.prompt);
        break;
      } catch (error) {
        errors.push(`Attempt ${retries + 1}: ${error}`);
        retries++;
        if (retries > this.config.maxRetries) {
          response = 'Error: Failed to get response';
        }
      }
    }

    const duration = Date.now() - startTime;
    const scores = await this.scorer.scoreResponse(task, response, duration);

    return {
      taskId: task.id,
      timestamp: startTime,
      duration,
      response,
      scores,
      contextUsed: this.extractContextUsed(response),
      criteriaMetCount: this.countMetCriteria(task, response),
      totalCriteria: task.successCriteria.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async executeCliCommand(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [
        join(process.cwd(), 'packages/cli/dist/index.js'),
        '--prompt', prompt,
        '--model', 'gemini-2.5-pro'
      ], {
        timeout: this.config.timeoutMs,
        env: { ...process.env, NO_COLOR: '1' }
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`CLI exited with code ${code}: ${errorOutput}`));
        } else {
          resolve(output);
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  private extractContextUsed(response: string): string[] {
    const contextPatterns = [
      /This is a (\w+) project/gi,
      /Using (\w+) for building/gi,
      /Recently modified files: ([^\n]+)/gi,
      /Based on (\w+) documentation/gi
    ];

    const contexts: string[] = [];
    for (const pattern of contextPatterns) {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        contexts.push(match[1]);
      }
    }
    return [...new Set(contexts)];
  }

  private countMetCriteria(task: BenchmarkTask, response: string): number {
    return task.successCriteria.filter(criterion => {
      const lowerResponse = response.toLowerCase();
      const lowerCriterion = criterion.toLowerCase();
      
      // Simple keyword matching for now
      const keywords = lowerCriterion.split(' ')
        .filter(word => word.length > 3);
      
      return keywords.every(keyword => lowerResponse.includes(keyword));
    }).length;
  }

  private calculateSummary(results: BenchmarkResult[]): BenchmarkSuite['summary'] {
    const totalTasks = results.length;
    const totalScore = results.reduce((sum, r) => sum + r.scores.overall, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const successCount = results.filter(r => r.scores.overall >= 0.6).length;

    return {
      totalTasks,
      averageScore: totalScore / totalTasks,
      averageDuration: totalDuration / totalTasks,
      successRate: successCount / totalTasks
    };
  }

  private async saveResults(suite: BenchmarkSuite): Promise<void> {
    const timestamp = new Date(suite.timestamp).toISOString().replace(/[:.]/g, '-');
    const outputDir = join(this.config.outputDir, timestamp);
    
    await mkdir(outputDir, { recursive: true });
    await writeFile(
      join(outputDir, 'results.json'),
      JSON.stringify(suite, null, 2)
    );

    console.log(`\n📊 Results saved to: ${outputDir}`);
  }

  private async getCliVersion(): Promise<string> {
    try {
      const packageJson = await import(join(process.cwd(), 'packages/cli/package.json'));
      return packageJson.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }
}