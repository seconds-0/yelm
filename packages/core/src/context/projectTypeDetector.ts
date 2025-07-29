/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ProjectType = 'react' | 'vue' | 'angular' | 'next' | 'node' | 'python' | null;

export interface ProjectContext {
  framework: ProjectType;
  buildTool: string | null;
  hasTypeScript: boolean;
}

interface PackageJson {
  name?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class ProjectTypeDetector {
  private cache: Map<string, ProjectContext> = new Map();

  async detectProjectType(projectPath: string): Promise<ProjectType> {
    const context = await this.getProjectContext(projectPath);
    return context.framework;
  }

  async getProjectContext(projectPath: string): Promise<ProjectContext> {
    // Check cache first
    const cached = this.cache.get(projectPath);
    if (cached) {
      return cached;
    }

    let framework: ProjectType = null;
    let buildTool: string | null = null;
    let hasTypeScript = false;

    try {
      // Read package.json
      const packageJsonPath = join(projectPath, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      // Detect framework
      framework = this.detectFrameworkFromPackageJson(packageJson);
      
      // Detect build tool
      buildTool = await this.detectBuildTool(projectPath, packageJson);
      
      // Check for TypeScript
      hasTypeScript = this.hasTypeScriptDependency(packageJson);

    } catch {
      // If no package.json, check for Python
      try {
        const requirementsPath = join(projectPath, 'requirements.txt');
        await readFile(requirementsPath, 'utf-8');
        framework = 'python';
      } catch {
        // Not a Python project either
      }
    }

    const context: ProjectContext = { framework, buildTool, hasTypeScript };
    this.cache.set(projectPath, context);
    return context;
  }

  private detectFrameworkFromPackageJson(packageJson: PackageJson): ProjectType {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Check for frameworks in order of specificity
    if (deps['next']) return 'next';
    if (deps['@angular/core']) return 'angular';
    if (deps['vue']) return 'vue';
    if (deps['react']) return 'react';
    
    // If no frontend framework, it's likely a Node.js project
    if (packageJson.name || packageJson.main) return 'node';
    
    return null;
  }

  private hasTypeScriptDependency(packageJson: PackageJson): boolean {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    return !!deps['typescript'];
  }

  private async detectBuildTool(projectPath: string, packageJson: PackageJson): Promise<string | null> {
    // Check for build tool config files
    const buildToolChecks = [
      { file: 'vite.config.js', tool: 'vite' },
      { file: 'vite.config.ts', tool: 'vite' },
      { file: 'webpack.config.js', tool: 'webpack' },
      { file: 'webpack.config.ts', tool: 'webpack' },
      { file: 'rollup.config.js', tool: 'rollup' },
      { file: 'esbuild.config.js', tool: 'esbuild' },
      { file: 'parcel.json', tool: 'parcel' },
      { file: '.parcelrc', tool: 'parcel' },
    ];

    // Check for config files
    for (const { file, tool } of buildToolChecks) {
      try {
        await readFile(join(projectPath, file), 'utf-8');
        return tool;
      } catch {
        // File doesn't exist, continue checking
      }
    }

    // Check package.json scripts for build tools
    const scripts = packageJson.scripts || {};
    const scriptContent = Object.values(scripts).join(' ');
    
    if (scriptContent.includes('vite')) return 'vite';
    if (scriptContent.includes('webpack')) return 'webpack';
    if (scriptContent.includes('rollup')) return 'rollup';
    if (scriptContent.includes('esbuild')) return 'esbuild';
    if (scriptContent.includes('parcel')) return 'parcel';
    if (scriptContent.includes('tsc')) return 'typescript';
    
    // Check dependencies
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    if (deps['vite']) return 'vite';
    if (deps['webpack']) return 'webpack';
    if (deps['rollup']) return 'rollup';
    if (deps['esbuild']) return 'esbuild';
    if (deps['parcel']) return 'parcel';
    
    return null;
  }

  clearCache(): void {
    this.cache.clear();
  }
}