#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Setup script for OAuth credentials
 * This helps users configure OAuth without exposing secrets in the repository
 */

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n🔐 Yelm OAuth Setup\n');
  console.log('This script will help you set up OAuth credentials for Yelm.\n');
  
  console.log('You have two options:');
  console.log('1. Use Gemini CLI credentials (recommended for compatibility)');
  console.log('2. Create your own OAuth credentials\n');
  
  const choice = await question('Enter your choice (1 or 2): ');
  
  if (choice === '1') {
    console.log('\n📋 To use Gemini CLI credentials:');
    console.log('1. Visit: https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/oauth2.ts');
    console.log('2. Find OAUTH_CLIENT_ID (starts with "681255809395-")');
    console.log('3. Find OAUTH_CLIENT_SECRET (starts with "GOCSPX-")\n');
    
    const clientId = await question('Enter OAUTH_CLIENT_ID: ');
    const clientSecret = await question('Enter OAUTH_CLIENT_SECRET: ');
    
    await createEnvFile(clientId.trim(), clientSecret.trim());
  } else if (choice === '2') {
    console.log('\n📋 To create your own OAuth credentials:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project or select an existing one');
    console.log('3. Navigate to "APIs & Services" → "Credentials"');
    console.log('4. Click "Create Credentials" → "OAuth 2.0 Client ID"');
    console.log('5. Select "Desktop application" as the application type\n');
    
    const clientId = await question('Enter your OAUTH_CLIENT_ID: ');
    const clientSecret = await question('Enter your OAUTH_CLIENT_SECRET: ');
    
    await createEnvFile(clientId.trim(), clientSecret.trim());
  } else {
    console.log('\n❌ Invalid choice. Please run the script again.');
    process.exit(1);
  }
  
  rl.close();
}

async function createEnvFile(clientId, clientSecret) {
  if (!clientId || !clientSecret) {
    console.log('\n❌ Invalid credentials. Please run the script again.');
    process.exit(1);
  }
  
  const envPath = join(ROOT_DIR, '.env');
  const envContent = `# Yelm OAuth Configuration
YELM_OAUTH_CLIENT_ID=${clientId}
YELM_OAUTH_CLIENT_SECRET=${clientSecret}
`;
  
  try {
    await fs.writeFile(envPath, envContent);
    console.log('\n✅ Successfully created .env file!');
    console.log('You can now run Yelm with authentication enabled.');
  } catch (error) {
    console.error('\n❌ Failed to create .env file:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);