/**
 * Yelm Coding Agent Core
 * 
 * Core functionality for the Yelm Coding Agent including:
 * - Context management and expansion
 * - Context7 integration with fallbacks
 * - Project analysis and pattern recognition
 * - Intelligent caching and performance optimization
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// Configuration schemas
const YelmConfigSchema = z.object({
  enableContext7: z.boolean().default(true),
  analyzeProject: z.boolean().default(false),
  includeFiles: z.array(z.string()).default([]),
  cacheDirectory: z.string().default('.yelm/cache'),
  context7Timeout: z.number().default(30000)
});

const ProjectAnalysisSchema = z.object({
  outputFile: z.string().optional(),
  enableCaching: z.boolean().default(true),
  maxDepth: z.number().default(10)
});

type YelmConfig = z.infer<typeof YelmConfigSchema>;
type ProjectAnalysisConfig = z.infer<typeof ProjectAnalysisSchema>;

// Core interfaces
interface DocumentationResult {
  error?: string;
  filePath: string;
  documentation: DocumentationSection[];
  fallback?: boolean;
  cached?: boolean;
}

interface DocumentationSection {
  title: string;
  content: string;
  relevance: number;
  source: string;
}

interface ProjectAnalysis {
  frameworks: string[];
  languages: string[];
  buildTools: string[];
  fileCount: number;
  structure: ProjectStructure;
  patterns: CodePattern[];
}

interface ProjectStructure {
  directories: string[];
  configFiles: string[];
  sourceFiles: string[];
  testFiles: string[];
}

interface CodePattern {
  type: string;
  pattern: string;
  confidence: number;
  examples: string[];
}

/**
 * Main Yelm Core class providing context management and analysis capabilities
 */
export class YelmCore {
  private config: YelmConfig | null = null;
  private cacheDir: string = '.yelm/cache';

  /**
   * Initialize the Yelm Core with configuration
   */
  async initialize(config: Partial<YelmConfig> = {}): Promise<void> {
    this.config = YelmConfigSchema.parse(config);
    this.cacheDir = this.config.cacheDirectory;

    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }

    console.log('🔧 Yelm Core initialized with configuration:', {
      context7: this.config.enableContext7,
      projectAnalysis: this.config.analyzeProject,
      caching: this.cacheDir
    });
  }

  /**
   * Start interactive coding session with context awareness
   */
  async startInteractiveSession(): Promise<void> {
    console.log('💬 Starting interactive session...');
    console.log('🚧 Interactive session implementation coming in Phase 3');
    console.log('📝 This will integrate with Gemini CLI\'s React/Ink UI system');
    
    // Placeholder for interactive session
    // Will be implemented in Phase 3: Core Agent Functionality
  }

  /**
   * Analyze project structure and generate context
   */
  async analyzeProject(config: Partial<ProjectAnalysisConfig> = {}): Promise<ProjectAnalysis> {
    const analysisConfig = ProjectAnalysisSchema.parse(config);
    
    console.log('🔍 Analyzing project structure...');
    
    // Basic project analysis implementation
    const analysis: ProjectAnalysis = {
      frameworks: this.detectFrameworks(),
      languages: this.detectLanguages(),
      buildTools: this.detectBuildTools(),
      fileCount: this.countFiles(),
      structure: this.analyzeStructure(),
      patterns: this.detectPatterns()
    };

    // Cache results if enabled
    if (analysisConfig.enableCaching) {
      this.cacheProjectAnalysis(analysis);
    }

    // Output to file if specified
    if (analysisConfig.outputFile) {
      writeFileSync(analysisConfig.outputFile, JSON.stringify(analysis, null, 2));
    }

    return analysis;
  }

  /**
   * Get documentation for a file using Context7 with fallback
   */
  async getDocumentation(filePath: string): Promise<DocumentationResult> {
    if (!this.config?.enableContext7) {
      return {
        filePath,
        documentation: [],
        fallback: true,
        error: 'Context7 disabled'
      };
    }

    try {
      // Use our Context7 CLI wrapper
      const result = await this.callContext7CLI(filePath);
      return result;
    } catch (error) {
      console.warn(`Context7 lookup failed for ${filePath}:`, error.message);
      
      // Return graceful fallback
      return {
        filePath,
        documentation: [],
        fallback: true,
        error: error.message
      };
    }
  }

  /**
   * Call Context7 CLI wrapper with timeout and error handling
   */
  private async callContext7CLI(filePath: string): Promise<DocumentationResult> {
    return new Promise((resolve, reject) => {
      const timeout = this.config?.context7Timeout || 30000;
      
      // Use our Context7 CLI wrapper script
      const child = spawn('node', ['scripts/context7-cli.js', filePath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new Error(`Invalid JSON from Context7: ${error.message}`));
          }
        } else {
          reject(new Error(`Context7 failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Context7 spawn error: ${error.message}`));
      });
    });
  }

  /**
   * Detect frameworks in the project
   */
  private detectFrameworks(): string[] {
    const frameworks: string[] = [];
    
    // Check package.json for common frameworks
    if (existsSync('package.json')) {
      try {
        const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        if (deps.react) frameworks.push('React');
        if (deps.vue) frameworks.push('Vue');
        if (deps.angular) frameworks.push('Angular');
        if (deps.express) frameworks.push('Express');
        if (deps.fastify) frameworks.push('Fastify');
        if (deps.next) frameworks.push('Next.js');
        if (deps.nuxt) frameworks.push('Nuxt.js');
      } catch (error) {
        console.warn('Failed to parse package.json:', error.message);
      }
    }

    return frameworks;
  }

  /**
   * Detect programming languages in the project
   */
  private detectLanguages(): string[] {
    const languages: string[] = [];
    
    if (existsSync('tsconfig.json')) languages.push('TypeScript');
    if (existsSync('package.json')) languages.push('JavaScript');
    if (existsSync('Cargo.toml')) languages.push('Rust');
    if (existsSync('go.mod')) languages.push('Go');
    if (existsSync('requirements.txt') || existsSync('pyproject.toml')) languages.push('Python');
    
    return languages;
  }

  /**
   * Detect build tools in the project
   */
  private detectBuildTools(): string[] {
    const buildTools: string[] = [];
    
    if (existsSync('package.json')) {
      try {
        const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        if (deps.webpack) buildTools.push('Webpack');
        if (deps.vite) buildTools.push('Vite');
        if (deps.esbuild) buildTools.push('esbuild');
        if (deps.rollup) buildTools.push('Rollup');
        if (deps.parcel) buildTools.push('Parcel');
      } catch (error) {
        console.warn('Failed to parse package.json for build tools:', error.message);
      }
    }
    
    if (existsSync('Makefile')) buildTools.push('Make');
    if (existsSync('Dockerfile')) buildTools.push('Docker');
    
    return buildTools;
  }

  /**
   * Count files in the project
   */
  private countFiles(): number {
    // Simple file counting - will be enhanced in Phase 2
    return 0; // Placeholder
  }

  /**
   * Analyze project structure
   */
  private analyzeStructure(): ProjectStructure {
    // Basic structure analysis - will be enhanced in Phase 2
    return {
      directories: [],
      configFiles: [],
      sourceFiles: [],
      testFiles: []
    };
  }

  /**
   * Detect code patterns
   */
  private detectPatterns(): CodePattern[] {
    // Pattern detection - will be enhanced in Phase 2
    return [];
  }

  /**
   * Cache project analysis results
   */
  private cacheProjectAnalysis(analysis: ProjectAnalysis): void {
    try {
      const cacheFile = join(this.cacheDir, 'project-analysis.json');
      const cached = {
        timestamp: Date.now(),
        analysis
      };
      writeFileSync(cacheFile, JSON.stringify(cached, null, 2));
      console.log('💾 Project analysis cached');
    } catch (error) {
      console.warn('Failed to cache project analysis:', error.message);
    }
  }
}