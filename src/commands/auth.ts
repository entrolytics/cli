import { createServer } from 'node:http';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import {
  clearAuth,
  getAuthCredentials,
  isAuthenticated,
  requireAuth,
  saveAuthCredentials,
} from '../lib/auth.js';
import { getApiHost } from '../lib/config.js';

const CALLBACK_PORT = 9876;

export async function loginCommand(): Promise<void> {
  if (isAuthenticated()) {
    const credentials = getAuthCredentials();
    const spinner = ora('Validating existing session...').start();

    // Import the validation function
    const { validateTokenWithServer } = await import('../lib/auth.js');
    const isValid = await validateTokenWithServer();

    if (isValid) {
      spinner.succeed(chalk.green('Session is valid'));
      console.log(chalk.yellow(`Already logged in as ${credentials?.email}`));
      console.log(chalk.dim('Run `entro-ng logout` first to switch accounts.'));
      return;
    }

    // Token is invalid - auto-logout and continue with login
    spinner.warn(chalk.yellow('Your session has expired or is invalid'));
    console.log(chalk.dim('Clearing invalid session and logging in again...\n'));
    clearAuth();
  }

  const spinner = ora('Opening browser for authentication...').start();

  try {
    // Create local server to receive OAuth callback
    const authCode = await waitForCallback();

    spinner.text = 'Exchanging authorization code...';

    // Exchange code for tokens
    const response = await fetch(`${getApiHost()}/api/auth/cli/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: authCode }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const data = await response.json();

    // Decode token to extract JTI for revocation tracking
    let jti: string | undefined;
    try {
      const payload = JSON.parse(Buffer.from(data.accessToken.split('.')[1], 'base64').toString());
      jti = payload.jti;
    } catch {
      // Non-fatal: JTI extraction failed, but authentication still works
      console.warn(chalk.yellow('Warning: Could not extract JTI from token'));
    }

    saveAuthCredentials({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      userId: data.user.id,
      email: data.user.email,
      displayName: data.user.displayName,
      jti,
    });

    spinner.succeed(chalk.green(`Logged in as ${data.user.email}`));
  } catch (error) {
    spinner.fail(chalk.red('Authentication failed'));
    console.error(chalk.dim(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function waitForCallback(): Promise<string> {
  const authUrl = `${getApiHost()}/cli/authorize?port=${CALLBACK_PORT}`;

  // Open browser
  const { default: open } = await import('open');
  await open(authUrl);

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${CALLBACK_PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication failed</h1><p>You can close this window.</p>');
        server.close();
        reject(new Error(error));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<h1>Authentication successful!</h1><p>You can close this window and return to the terminal.</p>',
        );
        server.close();
        resolve(code);
        return;
      }

      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing authorization code');
    });

    server.listen(CALLBACK_PORT);

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timed out'));
    }, 300000);
  });
}

export async function logoutCommand(): Promise<void> {
  const credentials = getAuthCredentials();

  if (credentials?.jti) {
    const spinner = ora('Revoking access token...').start();

    try {
      // Attempt to revoke the token on the server
      const response = await fetch(`${getApiHost()}/api/auth/cli/tokens`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credentials.accessToken}`,
        },
        body: JSON.stringify({ jti: credentials.jti }),
      });

      if (response.ok) {
        spinner.succeed(chalk.green('Token revoked successfully'));
      } else {
        spinner.warn(chalk.yellow('Could not revoke token on server'));
      }
    } catch {
      spinner.warn(chalk.yellow('Could not revoke token on server'));
    }
  }

  clearAuth();
  console.log(chalk.green('Logged out successfully'));
}

export async function whoamiCommand(): Promise<void> {
  if (!isAuthenticated()) {
    console.log(chalk.yellow('Not logged in. Run `entro-ng login` to authenticate.'));
    return;
  }

  const spinner = ora('Fetching user info...').start();

  const result = await api.getUser();

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch user info'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const user = result.data!;
  console.log(chalk.bold('Current User:'));
  console.log(`  Email: ${chalk.cyan(user.email)}`);
  console.log(`  Name: ${chalk.cyan(user.displayName || 'Not set')}`);
  console.log(`  Role: ${chalk.cyan(user.role)}`);
}

export async function switchCommand(org: string): Promise<void> {
  requireAuth();

  const spinner = ora('Switching organization...').start();

  // Fetch organizations to find the one matching the input
  const result = await api.getOrgs();

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch organizations'));
    console.error(chalk.dim(result.error));
    return;
  }

  const orgs = result.data || [];
  const targetOrg = orgs.find(
    (o: { id: string; name: string }) => o.id === org || o.name.toLowerCase() === org.toLowerCase(),
  );

  if (!targetOrg) {
    spinner.fail(chalk.red(`Organization '${org}' not found`));
    console.log(chalk.dim('\nAvailable organizations:'));
    for (const o of orgs) {
      console.log(chalk.dim(`  - ${o.name} (${o.id})`));
    }
    return;
  }

  // Update stored credentials with new org
  const credentials = getAuthCredentials();
  if (credentials) {
    saveAuthCredentials({
      ...credentials,
      organization: {
        id: targetOrg.id,
        name: targetOrg.name,
      },
    });
  }

  spinner.succeed(chalk.green(`Switched to organization: ${chalk.cyan(targetOrg.name)}`));
}
