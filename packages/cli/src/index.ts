#!/usr/bin/env node

/**
 * Yelm Coding Agent CLI
 * 
 * Advanced CLI-based coding assistant with sophisticated context management
 * Built on Gemini-CLI foundation with enhanced context expansion capabilities
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { YelmCore } from 'yelm-core';

const program = new Command();

// CLI Configuration
program
  .name('yelm')
  .description('Advanced CLI-based coding assistant with context management')
  .version('0.1.0');

// Basic chat command (extending Gemini CLI functionality)
program
  .command('chat')
  .description('Start an interactive coding session with context awareness')
  .option('-f, --file <file>', 'Include specific file in context')
  .option('-p, --project', 'Analyze entire project structure')
  .option('--no-context7', 'Disable Context7 documentation lookup')
  .action(async (options) => {
    console.log(chalk.blue('🚀 Starting Yelm Coding Agent...'));
    
    try {
      const core = new YelmCore();
      await core.initialize({
        enableContext7: !options.noContext7,
        analyzeProject: options.project,
        includeFiles: options.file ? [options.file] : []
      });
      
      console.log(chalk.green('✅ Yelm initialized successfully'));
      console.log(chalk.yellow('💡 Enhanced with context management capabilities'));
      
      // Start interactive session
      await core.startInteractiveSession();
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize Yelm:'), error.message);
      process.exit(1);
    }
  });

// Context analysis command
program
  .command('analyze')
  .description('Analyze project structure and generate context')
  .option('-o, --output <file>', 'Output analysis to file')
  .option('--cache', 'Cache analysis results')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Analyzing project context...'));
    
    try {
      const core = new YelmCore();
      const analysis = await core.analyzeProject({
        outputFile: options.output,
        enableCaching: options.cache
      });
      
      console.log(chalk.green('✅ Project analysis complete'));
      console.log(`📊 Found ${analysis.frameworks.length} frameworks`);
      console.log(`📁 Analyzed ${analysis.fileCount} files`);
      
    } catch (error) {
      console.error(chalk.red('❌ Analysis failed:'), error.message);
      process.exit(1);
    }
  });

// Context7 test command
program
  .command('context7')
  .description('Test Context7 documentation lookup')
  .argument('<file>', 'File to lookup documentation for')
  .action(async (file) => {
    console.log(chalk.blue(`🔍 Looking up documentation for ${file}...`));
    
    try {
      const core = new YelmCore();
      const docs = await core.getDocumentation(file);
      
      if (docs.error) {
        console.log(chalk.yellow('⚠️ Context7 unavailable, using fallback'));
      } else {
        console.log(chalk.green('✅ Documentation found'));
        console.log(`📚 ${docs.documentation.length} relevant sections`);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Documentation lookup failed:'), error.message);
      process.exit(1);
    }
  });

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (error) {
  console.error(chalk.red('❌ CLI Error:'), error.message);
  process.exit(1);
}