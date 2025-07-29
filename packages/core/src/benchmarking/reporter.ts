/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeFile } from 'node:fs/promises';
import { BenchmarkSuite, BenchmarkComparison, BenchmarkResult } from './types.js';

export class BenchmarkReporter {
  async generateReport(
    suite: BenchmarkSuite,
    outputPath: string,
    baseline?: BenchmarkSuite
  ): Promise<void> {
    const report = this.buildMarkdownReport(suite, baseline);
    await writeFile(outputPath, report);
    console.log(`\n📄 Report generated: ${outputPath}`);
  }

  private buildMarkdownReport(suite: BenchmarkSuite, baseline?: BenchmarkSuite): string {
    const lines: string[] = [
      `# Benchmark Report: ${suite.name}`,
      '',
      `**Version**: ${suite.version}`,
      `**Date**: ${new Date(suite.timestamp).toISOString()}`,
      `**Total Tasks**: ${suite.summary.totalTasks}`,
      '',
      '## Summary',
      '',
      `- **Average Score**: ${(suite.summary.averageScore * 100).toFixed(1)}%`,
      `- **Success Rate**: ${(suite.summary.successRate * 100).toFixed(1)}%`,
      `- **Average Duration**: ${(suite.summary.averageDuration / 1000).toFixed(1)}s`,
      ''
    ];

    if (baseline) {
      lines.push('## Comparison with Baseline', '');
      const comparison = this.compareResults(suite, baseline);
      lines.push(...this.formatComparison(comparison));
    }

    lines.push('## Task Results', '');
    
    for (let i = 0; i < suite.tasks.length; i++) {
      const task = suite.tasks[i];
      const result = suite.results[i];
      
      lines.push(
        `### ${i + 1}. ${task.name}`,
        '',
        `**Description**: ${task.description}`,
        `**Project Type**: ${task.projectType}`,
        '',
        '#### Scores',
        `- Overall: ${(result.scores.overall * 100).toFixed(1)}%`,
        `- Correctness: ${(result.scores.correctness * 100).toFixed(1)}%`,
        `- Context Usage: ${(result.scores.contextUsage * 100).toFixed(1)}%`,
        `- Code Quality: ${(result.scores.codeQuality * 100).toFixed(1)}%`,
        `- Performance: ${(result.scores.performance * 100).toFixed(1)}%`,
        '',
        `**Duration**: ${(result.duration / 1000).toFixed(1)}s`,
        `**Criteria Met**: ${result.criteriaMetCount}/${result.totalCriteria}`,
        ''
      );

      if (result.contextUsed.length > 0) {
        lines.push(
          '**Context Used**:',
          ...result.contextUsed.map(ctx => `- ${ctx}`),
          ''
        );
      }

      if (result.errors && result.errors.length > 0) {
        lines.push(
          '**Errors**:',
          ...result.errors.map(err => `- ${err}`),
          ''
        );
      }
    }

    return lines.join('\n');
  }

  private compareResults(current: BenchmarkSuite, baseline: BenchmarkSuite): BenchmarkComparison[] {
    const comparisons: BenchmarkComparison[] = [];

    for (let i = 0; i < current.tasks.length; i++) {
      const currentResult = current.results[i];
      const baselineResult = baseline.results.find(r => r.taskId === currentResult.taskId);
      
      if (baselineResult) {
        comparisons.push({
          baseline: baselineResult,
          current: currentResult,
          improvement: {
            overall: this.calculateImprovement(
              baselineResult.scores.overall,
              currentResult.scores.overall
            ),
            correctness: this.calculateImprovement(
              baselineResult.scores.correctness,
              currentResult.scores.correctness
            ),
            contextUsage: this.calculateImprovement(
              baselineResult.scores.contextUsage,
              currentResult.scores.contextUsage
            ),
            codeQuality: this.calculateImprovement(
              baselineResult.scores.codeQuality,
              currentResult.scores.codeQuality
            ),
            performance: this.calculateImprovement(
              baselineResult.scores.performance,
              currentResult.scores.performance
            )
          },
          regressions: this.findRegressions(baselineResult, currentResult)
        });
      }
    }

    return comparisons;
  }

  private calculateImprovement(baseline: number, current: number): number {
    if (baseline === 0) return current > 0 ? 100 : 0;
    return ((current - baseline) / baseline) * 100;
  }

  private findRegressions(baseline: BenchmarkResult, current: BenchmarkResult): string[] {
    const regressions: string[] = [];

    if (current.scores.overall < baseline.scores.overall) {
      regressions.push('Overall score decreased');
    }
    if (current.duration > baseline.duration * 1.2) {
      regressions.push('Response time increased by >20%');
    }
    if (current.criteriaMetCount < baseline.criteriaMetCount) {
      regressions.push('Fewer success criteria met');
    }

    return regressions;
  }

  private formatComparison(comparisons: BenchmarkComparison[]): string[] {
    const lines: string[] = [];
    
    const avgImprovement = comparisons.reduce(
      (sum, c) => sum + c.improvement.overall, 0
    ) / comparisons.length;

    lines.push(
      `**Average Improvement**: ${avgImprovement > 0 ? '+' : ''}${avgImprovement.toFixed(1)}%`,
      ''
    );

    if (avgImprovement > 10) {
      lines.push('✅ **Target achieved**: >10% improvement');
    } else {
      lines.push('❌ **Target not met**: <10% improvement');
    }

    const regressions = comparisons.filter(c => c.regressions.length > 0);
    if (regressions.length > 0) {
      lines.push(
        '',
        `⚠️ **Regressions found** in ${regressions.length} tasks`
      );
    }

    lines.push('');
    return lines;
  }

  async generateComparisonTable(
    current: BenchmarkSuite,
    baseline: BenchmarkSuite,
    outputPath: string
  ): Promise<void> {
    const comparisons = this.compareResults(current, baseline);
    const csv = this.buildCSV(comparisons);
    await writeFile(outputPath, csv);
    console.log(`📊 Comparison table saved: ${outputPath}`);
  }

  private buildCSV(comparisons: BenchmarkComparison[]): string {
    const headers = [
      'Task ID',
      'Baseline Score',
      'Current Score',
      'Improvement %',
      'Context Usage Improvement %',
      'Performance Improvement %',
      'Regressions'
    ];

    const rows = comparisons.map(c => [
      c.current.taskId,
      (c.baseline.scores.overall * 100).toFixed(1),
      (c.current.scores.overall * 100).toFixed(1),
      c.improvement.overall.toFixed(1),
      c.improvement.contextUsage.toFixed(1),
      c.improvement.performance.toFixed(1),
      c.regressions.join('; ')
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}