import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import chalk from 'chalk';
import Conf from 'conf';
import { getApiHost } from './config.js';
import type { AuthCredentials } from './types.js';

function getMachineSecret(): string {
  try {
    switch (process.platform) {
      case 'darwin': {
        const output = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], {
          encoding: 'utf8',
        });
        const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
        if (match?.[1]) {
          return match[1];
        }
        break;
      }
      case 'linux': {
        const machineId = readFileSync('/etc/machine-id', 'utf8').trim();
        if (machineId) {
          return machineId;
        }
        break;
      }
      case 'win32': {
        const output = execFileSync(
          'reg',
          ['query', 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
          { encoding: 'utf8' },
        );
        const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/);
        if (match?.[1]) {
          return match[1].trim();
        }
        break;
      }
    }
  } catch {}

  return `${os.hostname()}:${os.userInfo().username}:${os.homedir()}`;
}

function getEncryptionKey(): string {
  return createHash('sha256').update(`entro-cli:${getMachineSecret()}`).digest('hex');
}

function normalizeExpiresAt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

const authStore = new Conf<{ credentials?: AuthCredentials }>({
  projectName: 'entro-cli',
  configName: 'auth',
  encryptionKey: getEncryptionKey(),
});

export function getAuthCredentials(): AuthCredentials | undefined {
  const credentials = authStore.get('credentials');
  if (!credentials) {
    return undefined;
  }

  return {
    ...credentials,
    expiresAt: normalizeExpiresAt(credentials.expiresAt),
  };
}

export function getAuthToken(): string | undefined {
  const credentials = getAuthCredentials();
  return credentials?.accessToken;
}

export function isAuthenticated(): boolean {
  const credentials = getAuthCredentials();
  if (!credentials?.accessToken) return false;

  // Check if token is expired
  if (credentials.expiresAt !== undefined && Date.now() > credentials.expiresAt) {
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
  authStore.set('credentials', {
    ...credentials,
    expiresAt: normalizeExpiresAt(credentials.expiresAt),
  });
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
  console.log(chalk.yellow('\n⚠️  Your session is invalid or expired.'));
  console.log(chalk.dim('Please logout and login again:\n'));
  console.log(chalk.cyan('  entro-ng logout'));
  console.log(chalk.cyan('  entro-ng login\n'));
}
