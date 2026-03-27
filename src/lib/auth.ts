import Conf from 'conf';
import { getApiHost } from './config.js';
import type { AuthCredentials } from './types.js';

const authStore = new Conf<{ credentials?: AuthCredentials }>({
  projectName: 'entro-cli',
  configName: 'auth',
  encryptionKey: 'entro-cli-auth-key', // In production, use system keychain
});

export function getAuthCredentials(): AuthCredentials | undefined {
  return authStore.get('credentials');
}

export function getAuthToken(): string | undefined {
  const credentials = getAuthCredentials();
  return credentials?.accessToken;
}

export function isAuthenticated(): boolean {
  const credentials = getAuthCredentials();
  if (!credentials?.accessToken) return false;

  // Check if token is expired
  if (credentials.expiresAt && Date.now() > credentials.expiresAt) {
    return false;
  }

  return true;
}

/**
 * Validate token with the server
 * Returns true if token is valid, false otherwise
 */
export async function validateTokenWithServer(): Promise<boolean> {
  const credentials = getAuthCredentials();
  if (!credentials?.accessToken) return false;

  try {
    const response = await fetch(`${getApiHost()}/api/me`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    // If we get 401, token is invalid
    if (response.status === 401) {
      return false;
    }

    // Any other error, assume token might be valid (network issues, etc.)
    // but 2xx means definitely valid
    return response.ok;
  } catch {
    // Network error - can't determine, assume valid to avoid blocking
    return true;
  }
}

/**
 * Check if authenticated with optional server validation
 */
export async function isAuthenticatedWithValidation(validateWithServer = false): Promise<boolean> {
  // First check local state
  if (!isAuthenticated()) {
    return false;
  }

  // Optionally validate with server
  if (validateWithServer) {
    return await validateTokenWithServer();
  }

  return true;
}

export function saveAuthCredentials(credentials: AuthCredentials): void {
  authStore.set('credentials', credentials);
}

export function clearAuth(): void {
  authStore.delete('credentials');
}

export function requireAuth(): AuthCredentials {
  const credentials = getAuthCredentials();
  if (!credentials || !isAuthenticated()) {
    throw new Error('Not authenticated. Run `entro-ng login` first.');
  }
  return credentials;
}

/**
 * Check if an API error is due to invalid authentication
 * Returns true if the error indicates auth issues
 */
export function isAuthError(error: string | undefined, status?: number): boolean {
  if (status === 401) return true;
  if (!error) return false;
  const lowerError = error.toLowerCase();
  return (
    lowerError.includes('unauthorized') ||
    lowerError.includes('invalid token') ||
    lowerError.includes('expired')
  );
}

/**
 * Display helpful message for authentication errors
 */
export function displayAuthErrorHelp(): void {
  const chalk = require('chalk');
  console.log(chalk.yellow('\n⚠️  Your session is invalid or expired.'));
  console.log(chalk.dim('Please logout and login again:\n'));
  console.log(chalk.cyan('  entro-ng logout'));
  console.log(chalk.cyan('  entro-ng login\n'));
}
