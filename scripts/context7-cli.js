#!/usr/bin/env node

/**
 * Context7 CLI Wrapper
 * 
 * Simple CLI wrapper around Context7 API for reliable documentation lookup
 * Used both during development and in the Yelm Coding Agent
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '..', '.yelm', 'context7-cache');

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Generate cache key for a file path
 */
function getCacheKey(filePath) {
  return Buffer.from(filePath).toString('base64').replace(/[/+=]/g, '_');
}

/**
 * Get cached documentation if available and not expired
 */
function getCachedDocs(filePath, ttlMinutes = 60) {
  const cacheKey = getCacheKey(filePath);
  const cacheFile = join(CACHE_DIR, `${cacheKey}.json`);
  
  if (!existsSync(cacheFile)) {
    return null;
  }
  
  try {
    const cached = JSON.parse(readFileSync(cacheFile, 'utf8'));
    const age = Date.now() - cached.timestamp;
    const ttlMs = ttlMinutes * 60 * 1000;
    
    if (age < ttlMs) {
      console.log(`[Context7] Using cached docs for ${filePath}`);
      return cached.data;
    }
  } catch (error) {
    console.warn(`[Context7] Cache read error: ${error.message}`);
  }
  
  return null;
}

/**
 * Cache documentation results
 */
function cacheDocs(filePath, data) {
  const cacheKey = getCacheKey(filePath);
  const cacheFile = join(CACHE_DIR, `${cacheKey}.json`);
  
  try {
    const cached = {
      timestamp: Date.now(),
      filePath,
      data
    };
    writeFileSync(cacheFile, JSON.stringify(cached, null, 2));
    console.log(`[Context7] Cached docs for ${filePath}`);
  } catch (error) {
    console.warn(`[Context7] Cache write error: ${error.message}`);
  }
}

/**
 * Call Context7 via uvx with timeout and error handling
 */
async function callContext7(filePath, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    console.log(`[Context7] Looking up docs for ${filePath}...`);
    
    const child = spawn('uvx', ['context7', filePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: timeoutMs
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
          reject(new Error(`Context7 returned invalid JSON: ${error.message}`));
        }
      } else {
        reject(new Error(`Context7 failed with code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      reject(new Error(`Context7 spawn error: ${error.message}`));
    });
    
    // Handle timeout
    setTimeout(() => {
      if (!child.killed) {
        child.kill();
        reject(new Error(`Context7 timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);
  });
}

/**
 * Get documentation for a file with caching and fallback
 */
async function getDocumentation(filePath, options = {}) {
  const { useCache = true, ttlMinutes = 60, timeoutMs = 30000 } = options;
  
  // Try cache first
  if (useCache) {
    const cached = getCachedDocs(filePath, ttlMinutes);
    if (cached) {
      return cached;
    }
  }
  
  try {
    // Call Context7
    const result = await callContext7(filePath, timeoutMs);
    
    // Cache successful results
    if (useCache && result) {
      cacheDocs(filePath, result);
    }
    
    return result;
  } catch (error) {
    console.warn(`[Context7] Failed to get docs for ${filePath}: ${error.message}`);
    
    // Try to return stale cache as fallback
    if (useCache) {
      const staleCache = getCachedDocs(filePath, 24 * 60); // 24 hour fallback
      if (staleCache) {
        console.log(`[Context7] Using stale cache as fallback`);
        return staleCache;
      }
    }
    
    // Return empty result rather than throwing
    return {
      error: error.message,
      filePath,
      documentation: [],
      fallback: true
    };
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: context7-cli <file-path> [--no-cache] [--timeout=30000]');
    process.exit(1);
  }
  
  const filePath = args[0];
  const options = {
    useCache: !args.includes('--no-cache'),
    timeoutMs: parseInt(args.find(arg => arg.startsWith('--timeout='))?.split('=')[1] || '30000')
  };
  
  try {
    const result = await getDocumentation(filePath, options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use as module
export { getDocumentation, getCachedDocs, cacheDocs };

// Run as CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}