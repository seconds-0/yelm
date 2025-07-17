# Yelm Coding Agent - Detailed Architecture

> **Important**: This document describes the full target architecture. For implementation, follow the [Incremental Implementation Plan](INCREMENTAL-IMPLEMENTATION-PLAN.md) which builds toward this architecture step-by-step with testing and benchmarking at each stage.

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Context7 Integration](#context7-integration)
5. [Gemini CLI Extension Strategy](#gemini-cli-extension-strategy)
6. [Benchmarking System](#benchmarking-system)
7. [Configuration Management](#configuration-management)
8. [Build System](#build-system)
9. [Implementation Workflows](#implementation-workflows)
10. [Error Handling Strategy](#error-handling-strategy)

## Overview

Yelm extends Gemini CLI by adding intelligent context management. The architecture follows a layered approach where context enhancement wraps around the existing Gemini CLI functionality without breaking its core features.

```
┌─────────────────────────────────────────────┐
│          Yelm CLI Interface (React/Ink)     │
├─────────────────────────────────────────────┤
│         Context Enhancement Layer           │
├─────────────────────────────────────────────┤
│            Gemini CLI Core                  │
├─────────────────────────────────────────────┤
│         External Services (APIs)            │
└─────────────────────────────────────────────┘
```

## System Architecture

### Directory Structure
```
yelm/
├── packages/
│   ├── cli/                    # CLI package with React/Ink UI
│   │   ├── src/
│   │   │   ├── ui/            # React/Ink components
│   │   │   ├── config/        # Configuration management
│   │   │   ├── services/      # CLI-specific services
│   │   │   ├── context/       # Context enhancement UI
│   │   │   └── yelm.tsx       # Main entry point
│   │   └── package.json
│   └── core/                   # Core functionality package
│       ├── src/
│       │   ├── context/       # Context management system
│       │   ├── tools/         # Enhanced tools with context
│       │   ├── benchmarking/  # Benchmarking framework
│       │   ├── services/      # Core services
│       │   └── index.ts       # Core exports
│       └── package.json
├── .yelm/                      # User data directory
│   ├── conversations/          # Conversation history
│   ├── cache/                 # Context cache
│   ├── benchmarks/            # Benchmark results
│   └── config.json            # User configuration
└── references/
    └── gemini-cli/            # Original Gemini CLI for reference
```

### Component Interaction Flow
```
User Input → CLI Interface → Context Analyzer → Enhanced Request
                                    ↓
                            Context7 Lookup
                            Project Analysis
                            History Search
                                    ↓
                            Context Aggregator
                                    ↓
                         Gemini Request + Context
                                    ↓
                            Response Generator
                                    ↓
                            Enhanced Response → User
```

## Core Components

### 1. Context Management System (`packages/core/src/context/`)

```typescript
// packages/core/src/context/contextManager.ts
import { LRUCache } from '../utils/LruCache.js';
import { Context7Client } from './context7Client.js';
import { ProjectAnalyzer } from './projectAnalyzer.js';
import { ConversationMemory } from './conversationMemory.js';

export interface ContextRequest {
  userPrompt: string;
  currentFile?: string;
  projectPath: string;
  conversationId: string;
}

export interface ExpandedContext {
  documentation: DocumentationContext[];
  projectPatterns: ProjectPattern[];
  conversationHistory: HistoricalContext[];
  relevanceScore: number;
}

export class ContextManager {
  private cache: LRUCache<string, ExpandedContext>;
  private context7: Context7Client;
  private projectAnalyzer: ProjectAnalyzer;
  private memory: ConversationMemory;

  constructor(config: ContextConfig) {
    this.cache = new LRUCache({ maxSize: config.cacheSize });
    this.context7 = new Context7Client(config.context7);
    this.projectAnalyzer = new ProjectAnalyzer();
    this.memory = new ConversationMemory(config.memoryPath);
  }

  async expandContext(request: ContextRequest): Promise<ExpandedContext> {
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isStale(cached)) {
      return cached;
    }

    // Parallel context gathering
    const [docs, patterns, history] = await Promise.all([
      this.getDocumentation(request),
      this.getProjectPatterns(request),
      this.getRelevantHistory(request)
    ]);

    const expanded: ExpandedContext = {
      documentation: docs,
      projectPatterns: patterns,
      conversationHistory: history,
      relevanceScore: this.calculateRelevance(docs, patterns, history)
    };

    this.cache.set(cacheKey, expanded);
    return expanded;
  }

  private async getDocumentation(request: ContextRequest): Promise<DocumentationContext[]> {
    try {
      const results = await this.context7.findRelevantDocs(
        request.currentFile || request.projectPath,
        request.userPrompt
      );
      return this.rankByRelevance(results, request.userPrompt);
    } catch (error) {
      console.warn('Context7 lookup failed, continuing without docs:', error);
      return [];
    }
  }
}
```

### 2. Context7 Integration (`packages/core/src/context/context7Client.ts`)

```typescript
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface Context7Config {
  executable: string;  // Path to context7 CLI
  timeout: number;     // Request timeout in ms
  maxRetries: number;
  cacheDir: string;
}

export class Context7Client extends EventEmitter {
  private config: Context7Config;
  private process: ChildProcess | null = null;
  private requestQueue: RequestQueue;

  constructor(config: Context7Config) {
    super();
    this.config = config;
    this.requestQueue = new RequestQueue();
  }

  async findRelevantDocs(filePath: string, query: string): Promise<DocumentationResult[]> {
    const cacheKey = `${filePath}:${query}`;
    const cached = await this.checkCache(cacheKey);
    if (cached) return cached;

    return this.executeWithRetry(async () => {
      const result = await this.runContext7Command([
        'search',
        '--file', filePath,
        '--query', query,
        '--format', 'json'
      ]);

      const docs = this.parseContext7Output(result);
      await this.cacheResult(cacheKey, docs);
      return docs;
    });
  }

  private async runContext7Command(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.config.executable, args, {
        timeout: this.config.timeout,
        env: { ...process.env, CONTEXT7_CACHE: this.config.cacheDir }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => stdout += data);
      child.stderr.on('data', (data) => stderr += data);

      child.on('error', (error) => {
        reject(new Context7Error(`Failed to spawn context7: ${error.message}`, 'SPAWN_ERROR'));
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Context7Error(`Context7 exited with code ${code}: ${stderr}`, 'COMMAND_ERROR'));
        }
      });
    });
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < this.config.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
      }
    }
    
    throw lastError;
  }
}
```

### 3. Project Analyzer (`packages/core/src/context/projectAnalyzer.ts`)

```typescript
import { glob } from 'glob';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProjectPattern {
  type: 'framework' | 'buildTool' | 'convention' | 'dependency';
  name: string;
  confidence: number;
  evidence: string[];
}

export class ProjectAnalyzer {
  private cache: Map<string, ProjectAnalysis> = new Map();

  async analyzeProject(projectPath: string): Promise<ProjectPattern[]> {
    const cached = this.cache.get(projectPath);
    if (cached && !this.isStale(cached)) {
      return cached.patterns;
    }

    const patterns: ProjectPattern[] = [];

    // Parallel analysis of different aspects
    const [
      frameworkPatterns,
      buildPatterns,
      conventionPatterns,
      dependencyPatterns
    ] = await Promise.all([
      this.detectFrameworks(projectPath),
      this.detectBuildTools(projectPath),
      this.detectConventions(projectPath),
      this.analyzeDependencies(projectPath)
    ]);

    patterns.push(...frameworkPatterns, ...buildPatterns, ...conventionPatterns, ...dependencyPatterns);

    const analysis = { patterns, timestamp: Date.now() };
    this.cache.set(projectPath, analysis);

    return patterns;
  }

  private async detectFrameworks(projectPath: string): Promise<ProjectPattern[]> {
    const patterns: ProjectPattern[] = [];

    // React detection
    const packageJson = await this.readPackageJson(projectPath);
    if (packageJson?.dependencies?.react || packageJson?.devDependencies?.react) {
      patterns.push({
        type: 'framework',
        name: 'React',
        confidence: 1.0,
        evidence: ['react in package.json']
      });

      // Check for Next.js
      if (packageJson?.dependencies?.next || packageJson?.devDependencies?.next) {
        patterns.push({
          type: 'framework',
          name: 'Next.js',
          confidence: 1.0,
          evidence: ['next in package.json']
        });
      }
    }

    // Angular detection
    const angularJson = path.join(projectPath, 'angular.json');
    if (await this.fileExists(angularJson)) {
      patterns.push({
        type: 'framework',
        name: 'Angular',
        confidence: 1.0,
        evidence: ['angular.json exists']
      });
    }

    // Vue detection
    if (packageJson?.dependencies?.vue || packageJson?.devDependencies?.vue) {
      patterns.push({
        type: 'framework',
        name: 'Vue',
        confidence: 1.0,
        evidence: ['vue in package.json']
      });
    }

    return patterns;
  }

  private async detectBuildTools(projectPath: string): Promise<ProjectPattern[]> {
    const patterns: ProjectPattern[] = [];
    const packageJson = await this.readPackageJson(projectPath);

    // NPM scripts analysis
    if (packageJson?.scripts) {
      const scripts = packageJson.scripts;
      
      if (scripts.build?.includes('webpack')) {
        patterns.push({
          type: 'buildTool',
          name: 'Webpack',
          confidence: 1.0,
          evidence: ['webpack in build script']
        });
      }

      if (scripts.build?.includes('vite') || scripts.dev?.includes('vite')) {
        patterns.push({
          type: 'buildTool',
          name: 'Vite',
          confidence: 1.0,
          evidence: ['vite in scripts']
        });
      }

      if (scripts.build?.includes('esbuild')) {
        patterns.push({
          type: 'buildTool',
          name: 'esbuild',
          confidence: 1.0,
          evidence: ['esbuild in build script']
        });
      }

      // Test framework detection
      if (scripts.test?.includes('vitest')) {
        patterns.push({
          type: 'buildTool',
          name: 'Vitest',
          confidence: 1.0,
          evidence: ['vitest in test script']
        });
      } else if (scripts.test?.includes('jest')) {
        patterns.push({
          type: 'buildTool',
          name: 'Jest',
          confidence: 1.0,
          evidence: ['jest in test script']
        });
      }
    }

    return patterns;
  }
}
```

### 4. Enhanced Gemini Chat (`packages/core/src/core/enhancedGeminiChat.ts`)

```typescript
import { GeminiChat, GeminiChatOptions } from './geminiChat.js';
import { ContextManager } from '../context/contextManager.js';
import { Turn } from './turn.js';

export class EnhancedGeminiChat extends GeminiChat {
  private contextManager: ContextManager;

  constructor(options: GeminiChatOptions & { contextConfig: ContextConfig }) {
    super(options);
    this.contextManager = new ContextManager(options.contextConfig);
  }

  async sendMessage(message: string, options?: SendMessageOptions): Promise<Turn> {
    // Expand context before sending
    const expandedContext = await this.contextManager.expandContext({
      userPrompt: message,
      currentFile: options?.currentFile,
      projectPath: this.config.projectPath,
      conversationId: this.conversationId
    });

    // Inject context into the message
    const enhancedMessage = this.buildEnhancedPrompt(message, expandedContext);

    // Call parent implementation with enhanced message
    const response = await super.sendMessage(enhancedMessage, options);

    // Store context used for this turn
    response.metadata = {
      ...response.metadata,
      contextUsed: expandedContext
    };

    return response;
  }

  private buildEnhancedPrompt(userMessage: string, context: ExpandedContext): string {
    const sections: string[] = [userMessage];

    if (context.documentation.length > 0) {
      sections.push('\n## Relevant Documentation\n');
      sections.push(...context.documentation.slice(0, 3).map(doc => 
        `### ${doc.source}\n${doc.content}\n`
      ));
    }

    if (context.projectPatterns.length > 0) {
      sections.push('\n## Project Context\n');
      sections.push(...context.projectPatterns.map(pattern =>
        `- Uses ${pattern.name} (${pattern.type})`
      ));
    }

    return sections.join('\n');
  }
}
```

## Benchmarking System

### Architecture
```typescript
// packages/core/src/benchmarking/benchmarkRunner.ts
export interface BenchmarkTask {
  id: string;
  name: string;
  description: string;
  prompt: string;
  setupFiles?: FileSetup[];
  expectedBehavior: ExpectedBehavior;
  scoringCriteria: ScoringCriterion[];
}

export interface BenchmarkResult {
  taskId: string;
  timestamp: Date;
  scores: {
    baseline: number;      // Gemini CLI score
    enhanced: number;      // Yelm score
    improvement: number;   // Percentage improvement
  };
  details: {
    timeToComplete: number;
    tokensUsed: number;
    contextRelevance: number;
    outputQuality: QualityMetrics;
  };
}

export class BenchmarkRunner {
  private baselineRunner: GeminiCLIRunner;
  private enhancedRunner: YelmRunner;
  private scorer: ResponseScorer;

  async runBenchmark(task: BenchmarkTask): Promise<BenchmarkResult> {
    // Setup test environment
    const testDir = await this.setupTestEnvironment(task);

    // Run baseline (Gemini CLI without context)
    const baselineResult = await this.baselineRunner.execute({
      prompt: task.prompt,
      workingDir: testDir,
      timeout: 60000
    });

    // Run enhanced (Yelm with context)
    const enhancedResult = await this.enhancedRunner.execute({
      prompt: task.prompt,
      workingDir: testDir,
      timeout: 60000
    });

    // Score both results
    const baselineScore = await this.scorer.score(baselineResult, task.scoringCriteria);
    const enhancedScore = await this.scorer.score(enhancedResult, task.scoringCriteria);

    return {
      taskId: task.id,
      timestamp: new Date(),
      scores: {
        baseline: baselineScore.total,
        enhanced: enhancedScore.total,
        improvement: ((enhancedScore.total - baselineScore.total) / baselineScore.total) * 100
      },
      details: {
        timeToComplete: enhancedResult.duration,
        tokensUsed: enhancedResult.tokensUsed,
        contextRelevance: enhancedScore.contextRelevance,
        outputQuality: enhancedScore.quality
      }
    };
  }
}
```

### Benchmark Tasks
```typescript
// packages/core/src/benchmarking/tasks/index.ts
export const benchmarkTasks: BenchmarkTask[] = [
  {
    id: 'react-component',
    name: 'Create React Component',
    description: 'Create a React component following project conventions',
    prompt: 'Create a Button component that matches our existing component patterns',
    setupFiles: [
      {
        path: 'src/components/Input.tsx',
        content: `// Existing component for pattern reference
import React from 'react';
import { BaseComponentProps } from '../types';
import styles from './Input.module.css';

export interface InputProps extends BaseComponentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const Input: React.FC<InputProps> = ({ 
  value, 
  onChange, 
  placeholder,
  className,
  ...rest 
}) => {
  return (
    <input
      className={\`\${styles.input} \${className || ''}\`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      {...rest}
    />
  );
};`
      }
    ],
    expectedBehavior: {
      shouldExist: ['src/components/Button.tsx', 'src/components/Button.module.css'],
      shouldContain: {
        'src/components/Button.tsx': ['BaseComponentProps', 'React.FC', 'styles']
      }
    },
    scoringCriteria: [
      {
        name: 'Pattern Consistency',
        weight: 0.4,
        evaluate: (response) => {
          // Check if follows same patterns as Input component
          const hasInterface = response.includes('interface ButtonProps');
          const extendsBase = response.includes('extends BaseComponentProps');
          const usesStyles = response.includes('styles.button');
          return (hasInterface ? 0.33 : 0) + (extendsBase ? 0.33 : 0) + (usesStyles ? 0.34 : 0);
        }
      }
    ]
  }
];
```

## Configuration Management

### User Configuration Schema
```typescript
// packages/cli/src/config/yelmConfig.ts
import { z } from 'zod';

export const YelmConfigSchema = z.object({
  // Gemini CLI config (inherited)
  geminiApiKey: z.string(),
  model: z.string().default('gemini-2.0-flash-exp'),
  
  // Yelm-specific config
  context: z.object({
    enabled: z.boolean().default(true),
    context7: z.object({
      executable: z.string().default('context7'),
      timeout: z.number().default(10000),
      maxRetries: z.number().default(3)
    }),
    projectAnalysis: z.object({
      enabled: z.boolean().default(true),
      cacheTimeout: z.number().default(3600000), // 1 hour
      maxDepth: z.number().default(5)
    }),
    memory: z.object({
      enabled: z.boolean().default(true),
      maxConversations: z.number().default(100),
      retentionDays: z.number().default(30)
    })
  }),
  
  benchmarking: z.object({
    enabled: z.boolean().default(false),
    outputDir: z.string().default('.yelm/benchmarks'),
    compareTo: z.enum(['baseline', 'previous']).default('baseline')
  }),
  
  ui: z.object({
    theme: z.string().default('default'),
    showContextIndicator: z.boolean().default(true),
    contextDisplayMode: z.enum(['inline', 'sidebar', 'hidden']).default('inline')
  })
});

export type YelmConfig = z.infer<typeof YelmConfigSchema>;
```

### Configuration Loading
```typescript
// packages/cli/src/config/configLoader.ts
export class ConfigLoader {
  private configPaths = [
    path.join(os.homedir(), '.yelm', 'config.json'),
    path.join(process.cwd(), '.yelm', 'config.json'),
    path.join(process.cwd(), 'yelm.config.json')
  ];

  async load(): Promise<YelmConfig> {
    // Load base Gemini CLI config
    const baseConfig = await loadGeminiConfig();
    
    // Load Yelm config overlays
    let yelmConfig: Partial<YelmConfig> = {};
    
    for (const configPath of this.configPaths) {
      if (await this.fileExists(configPath)) {
        const fileConfig = await this.loadJsonFile(configPath);
        yelmConfig = this.mergeConfigs(yelmConfig, fileConfig);
      }
    }
    
    // Merge with environment variables
    const envConfig = this.loadFromEnv();
    const finalConfig = this.mergeConfigs(baseConfig, yelmConfig, envConfig);
    
    // Validate final config
    return YelmConfigSchema.parse(finalConfig);
  }
}
```

## Build System

### Fixing TypeScript Compilation Issues

The current build hanging is likely due to circular dependencies. Here's the fix strategy:

```typescript
// packages/cli/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "jsx": "react",
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "yelm-core": ["../core/src/index.ts"],
      "yelm-core/*": ["../core/src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../core" }
  ]
}
```

### Build Script Fix
```javascript
// scripts/build.js
import { build } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';

async function buildPackages() {
  // Build core first
  console.log('Building @yelm/core...');
  await build({
    entryPoints: ['packages/core/src/index.ts'],
    outdir: 'packages/core/dist',
    format: 'esm',
    platform: 'node',
    target: 'node20',
    plugins: [nodeExternalsPlugin()],
    sourcemap: true,
    // Prevent circular dependency issues
    metafile: true,
    logLevel: 'info'
  });

  // Then build CLI
  console.log('Building @yelm/cli...');
  await build({
    entryPoints: ['packages/cli/src/yelm.tsx'],
    outdir: 'packages/cli/dist',
    format: 'esm',
    platform: 'node',
    target: 'node20',
    plugins: [nodeExternalsPlugin()],
    sourcemap: true,
    bundle: true,
    // Exclude ink from bundling to avoid issues
    external: ['ink', 'react', 'yelm-core'],
    logLevel: 'info'
  });
}

buildPackages().catch(console.error);
```

## Implementation Workflows

### 1. Context-Enhanced Request Flow
```
1. User enters prompt in CLI
2. InputPrompt component captures input
3. YelmApp passes to EnhancedGeminiChat
4. ContextManager.expandContext() called:
   a. Check cache for recent context
   b. Parallel fetch:
      - Context7 documentation lookup
      - Project structure analysis
      - Conversation history search
   c. Aggregate and score relevance
5. Build enhanced prompt with context
6. Send to Gemini API
7. Display response with context indicators
```

### 2. Benchmark Execution Flow
```
1. User runs: yelm benchmark [task-id]
2. BenchmarkCommand validates task exists
3. BenchmarkRunner.runBenchmark():
   a. Setup test environment
   b. Run baseline (disable context)
   c. Run enhanced (with context)
   d. Score both outputs
   e. Calculate improvement
4. Store results in .yelm/benchmarks/
5. Display comparison report
```

### 3. Context7 Integration Flow
```
1. Context request received
2. Context7Client checks cache
3. If miss, spawn context7 process:
   context7 search --file [path] --query "[query]" --format json
4. Parse JSON output
5. Extract relevant sections
6. Cache results with TTL
7. Return to ContextManager
```

## Error Handling Strategy

### Graceful Degradation Levels

```typescript
export enum DegradationLevel {
  FULL = 'full',          // All features working
  NO_DOCS = 'no_docs',    // Context7 failed, rest working
  BASIC = 'basic',        // Only project analysis working
  MINIMAL = 'minimal'     // Fallback to base Gemini CLI
}

export class ErrorHandler {
  private degradationLevel = DegradationLevel.FULL;

  async handleContextError(error: Error, component: string): Promise<void> {
    console.warn(`Context component ${component} failed:`, error.message);

    switch (component) {
      case 'context7':
        this.degradationLevel = DegradationLevel.NO_DOCS;
        this.notifyUser('Documentation lookup unavailable, continuing with project context only');
        break;
      
      case 'projectAnalyzer':
        this.degradationLevel = DegradationLevel.BASIC;
        this.notifyUser('Project analysis failed, using basic context');
        break;
      
      default:
        this.degradationLevel = DegradationLevel.MINIMAL;
        this.notifyUser('Context system unavailable, using standard mode');
    }
  }

  canUseFeature(feature: string): boolean {
    const featureRequirements: Record<string, DegradationLevel> = {
      'documentation': DegradationLevel.FULL,
      'projectPatterns': DegradationLevel.NO_DOCS,
      'basicContext': DegradationLevel.BASIC
    };

    return this.degradationLevel <= featureRequirements[feature];
  }
}
```

## Testing Strategy

### Unit Test Structure
```typescript
// packages/core/src/context/__tests__/contextManager.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ContextManager } from '../contextManager';

describe('ContextManager', () => {
  it('should cache context lookups', async () => {
    const manager = new ContextManager(mockConfig);
    const context7Spy = vi.spyOn(manager['context7'], 'findRelevantDocs');
    
    // First call
    await manager.expandContext(mockRequest);
    expect(context7Spy).toHaveBeenCalledTimes(1);
    
    // Second call (should use cache)
    await manager.expandContext(mockRequest);
    expect(context7Spy).toHaveBeenCalledTimes(1);
  });

  it('should gracefully handle Context7 failures', async () => {
    const manager = new ContextManager(mockConfig);
    vi.spyOn(manager['context7'], 'findRelevantDocs').mockRejectedValue(new Error('Context7 failed'));
    
    const result = await manager.expandContext(mockRequest);
    expect(result.documentation).toEqual([]);
    expect(result.projectPatterns.length).toBeGreaterThan(0); // Other features still work
  });
});
```

### Integration Test Structure
```typescript
// packages/cli/src/__tests__/integration/context-flow.test.ts
describe('Context Enhancement Flow', () => {
  it('should enhance prompts with relevant context', async () => {
    // Setup test project
    const testProject = await createTestProject({
      type: 'react',
      files: {
        'src/components/Button.tsx': mockButtonComponent,
        'package.json': mockPackageJson
      }
    });

    // Run CLI with prompt
    const result = await runYelmCLI({
      prompt: 'Create a new Input component similar to Button',
      cwd: testProject.path
    });

    // Verify context was used
    expect(result.response).toContain('following the pattern from Button.tsx');
    expect(result.metadata.contextUsed.projectPatterns).toContainEqual(
      expect.objectContaining({ name: 'React' })
    );
  });
});
```

## Performance Optimization

### Context Caching Strategy
```typescript
export class ContextCache {
  private memoryCache: LRUCache<string, CachedContext>;
  private diskCache: DiskCache;

  constructor(config: CacheConfig) {
    this.memoryCache = new LRUCache({ 
      maxSize: config.memoryCacheSize || 100,
      ttl: config.memoryTTL || 5 * 60 * 1000 // 5 minutes
    });
    
    this.diskCache = new DiskCache({
      directory: config.cacheDir,
      maxSize: config.diskCacheSize || 1000,
      ttl: config.diskTTL || 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  async get(key: string): Promise<CachedContext | null> {
    // Try memory first
    const memResult = this.memoryCache.get(key);
    if (memResult) return memResult;

    // Try disk
    const diskResult = await this.diskCache.get(key);
    if (diskResult) {
      // Promote to memory cache
      this.memoryCache.set(key, diskResult);
      return diskResult;
    }

    return null;
  }
}
```

### Parallel Processing
```typescript
export class ParallelContextGatherer {
  async gatherContext(request: ContextRequest): Promise<ExpandedContext> {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      // All operations in parallel with individual timeouts
      const results = await Promise.allSettled([
        this.getDocsWithTimeout(request, 3000),
        this.getProjectPatternsWithTimeout(request, 2000),
        this.getHistoryWithTimeout(request, 1000)
      ]);

      return this.assembleContext(results);
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

## Monitoring and Metrics

### Performance Tracking
```typescript
export class PerformanceMonitor {
  private metrics: MetricsCollector;

  async trackContextExpansion(fn: () => Promise<ExpandedContext>): Promise<ExpandedContext> {
    const start = performance.now();
    const startMemory = process.memoryUsage();

    try {
      const result = await fn();
      
      this.metrics.record({
        operation: 'context_expansion',
        duration: performance.now() - start,
        memoryDelta: process.memoryUsage().heapUsed - startMemory.heapUsed,
        contextSize: JSON.stringify(result).length,
        success: true
      });

      return result;
    } catch (error) {
      this.metrics.record({
        operation: 'context_expansion',
        duration: performance.now() - start,
        error: error.message,
        success: false
      });
      throw error;
    }
  }
}
```

## Next Steps for Implementation

1. **Fix Build System** (Priority 1)
   - Resolve circular dependencies
   - Update build scripts
   - Verify all packages compile

2. **Implement Context7 Client** (Priority 2)
   - Create subprocess wrapper
   - Add retry logic
   - Implement caching

3. **Build Project Analyzer** (Priority 3)
   - Framework detection
   - Build tool identification
   - Convention extraction

4. **Enhance Gemini Chat** (Priority 4)
   - Extend base class
   - Inject context
   - Update UI components

5. **Connect Benchmarking** (Priority 5)
   - Implement runners
   - Create scoring system
   - Add comparison reports

This architecture provides concrete implementation guidance while maintaining flexibility for future enhancements.