# OAuth Setup for Yelm

## Quick Start

To enable Google authentication in Yelm, you need to configure OAuth credentials.

### Automated Setup (Recommended)

Run the setup script to configure OAuth credentials interactively:

```bash
npm run setup-oauth
```

This script will guide you through setting up OAuth credentials, either using Gemini CLI's credentials or creating your own.

### Manual Setup

#### Option 1: Use Gemini CLI Credentials (Recommended for Testing)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get the OAuth credentials from the [original Gemini CLI source](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/oauth2.ts):
   - Look for `OAUTH_CLIENT_ID` (starts with `681255809395-`)
   - Look for `OAUTH_CLIENT_SECRET` (starts with `GOCSPX-`)
   
3. Replace the placeholders in your `.env` file with these values.

#### Option 2: Create Your Own OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Select "Desktop application" as the application type
6. Copy the generated Client ID and Client Secret
7. Create a `.env` file in the project root with:
   ```
   YELM_OAUTH_CLIENT_ID=your_client_id_here
   YELM_OAUTH_CLIENT_SECRET=your_client_secret_here
   ```

## Important Notes

- The OAuth credentials in `.env.example` are not user-specific secrets - they are application-level credentials for the "installed application" OAuth flow
- These credentials are the same ones used in the open-source Gemini CLI project
- For production use, you should create your own OAuth credentials
- The `.env` file is gitignored and will not be committed to the repository

## Troubleshooting

If you see a "401 invalid client" error:
1. Make sure you have created a `.env` file with valid OAuth credentials
2. Verify the credentials are correctly formatted (no extra spaces or quotes)
3. Restart the Yelm CLI after updating the `.env` file