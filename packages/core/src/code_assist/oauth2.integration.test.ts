/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OAuth2Client } from 'google-auth-library';

describe('OAuth2 Integration', () => {
  beforeEach(() => {
    // Skip these tests if OAuth credentials are not configured
    const clientId = process.env.YELM_OAUTH_CLIENT_ID || '';
    const clientSecret = process.env.YELM_OAUTH_CLIENT_SECRET || '';
    
    if (!clientId || !clientSecret || 
        clientId === '<GET_FROM_GEMINI_CLI_SOURCE>' || 
        clientSecret === '<GET_FROM_GEMINI_CLI_SOURCE>') {
      console.log('Skipping OAuth2 integration tests - credentials not configured');
      return;
    }
  });

  it('should be able to create OAuth2Client with valid credentials', () => {
    const clientId = process.env.YELM_OAUTH_CLIENT_ID || '';
    const clientSecret = process.env.YELM_OAUTH_CLIENT_SECRET || '';
    
    // Skip if not configured
    if (!clientId || !clientSecret) {
      expect(true).toBe(true);
      return;
    }
    
    // Ensure credentials are not placeholders
    expect(clientId).not.toBe('YOUR_CLIENT_ID_HERE');
    expect(clientSecret).not.toBe('YOUR_CLIENT_SECRET_HERE');
    expect(clientId).not.toBe('<GET_FROM_GEMINI_CLI_SOURCE>');
    expect(clientSecret).not.toBe('<GET_FROM_GEMINI_CLI_SOURCE>');
    
    // Create OAuth2Client - this would fail if credentials format is invalid
    const client = new OAuth2Client({
      clientId,
      clientSecret,
    });
    
    expect(client).toBeDefined();
    expect(client._clientId).toBe(clientId);
    expect(client._clientSecret).toBe(clientSecret);
  });

  it('should generate valid auth URL when credentials are configured', () => {
    const clientId = process.env.YELM_OAUTH_CLIENT_ID || '';
    const clientSecret = process.env.YELM_OAUTH_CLIENT_SECRET || '';
    
    // Skip if not configured
    if (!clientId || !clientSecret || 
        clientId === '<GET_FROM_GEMINI_CLI_SOURCE>' || 
        clientSecret === '<GET_FROM_GEMINI_CLI_SOURCE>') {
      expect(true).toBe(true);
      return;
    }
    
    const client = new OAuth2Client({
      clientId,
      clientSecret,
    });
    
    const authUrl = client.generateAuthUrl({
      redirect_uri: 'http://localhost:3000/oauth2callback',
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    
    expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(authUrl).toContain(encodeURIComponent(clientId));
    expect(authUrl).not.toContain('YOUR_CLIENT_ID_HERE');
  });
});