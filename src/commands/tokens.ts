import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { api } from '../lib/api.js';
import { getAuthCredentials, requireAuth } from '../lib/auth.js';

export async function tokensListCommand(): Promise<void> {
  requireAuth();

  const spinner = ora('Fetching active tokens...').start();

  const result = await api.listCliTokens();

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch tokens'));
    console.error(chalk.dim(result.error));
    process.exit(1);
  }

  spinner.stop();

  const tokens = result.data || [];

  if (tokens.length === 0) {
    console.log(chalk.yellow('No active tokens found'));
    return;
  }

  const table = new Table({
    head: ['JTI', 'Created', 'Last Used', 'IP Address', 'Current'].map(h => chalk.cyan(h)),
    style: {
      head: [],
      border: ['dim'],
    },
  });

  const currentJti = getAuthCredentials()?.jti;

  for (const token of tokens) {
    const createdDate = new Date(token.createdAt).toLocaleString();
    const lastUsed = token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : 'Never';
    const jtiShort = token.jti.substring(0, 8) + '...';
    const isCurrent = token.jti === currentJti;

    table.push([
      jtiShort,
      createdDate,
      lastUsed,
      token.ipAddress || 'N/A',
      isCurrent ? chalk.green('✓') : '',
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`\nTotal: ${tokens.length} active token(s)`));
}

export async function tokensRevokeCommand(jti?: string): Promise<void> {
  requireAuth();

  const credentials = getAuthCredentials();

  if (!jti && !credentials?.jti) {
    console.error(chalk.red('No JTI provided and current session has no JTI'));
    process.exit(1);
  }

  const targetJti = jti || credentials?.jti!;
  const isCurrentToken = targetJti === credentials?.jti;

  if (isCurrentToken) {
    console.log(chalk.yellow('Warning: You are about to revoke your current session token.'));
    console.log(chalk.dim('You will need to run `entro-ng login` again to authenticate.\n'));
  }

  const spinner = ora(`Revoking token ${targetJti.substring(0, 8)}...`).start();

  const result = await api.revokeCliToken(targetJti);

  if (result.error) {
    spinner.fail(chalk.red('Failed to revoke token'));
    console.error(chalk.dim(result.error));
    process.exit(1);
  }

  spinner.succeed(chalk.green('Token revoked successfully'));

  if (isCurrentToken) {
    console.log(chalk.yellow('\nYour session has been terminated.'));
    console.log(chalk.dim('Run `entro-ng login` to authenticate again.'));
  }
}

export async function tokensRevokeAllCommand(): Promise<void> {
  requireAuth();

  console.log(chalk.yellow('Warning: This will revoke ALL your CLI tokens.'));
  console.log(chalk.dim('You will need to run `entro-ng login` again to authenticate.\n'));

  const spinner = ora('Revoking all tokens...').start();

  const result = await api.revokeAllCliTokens();

  if (result.error) {
    spinner.fail(chalk.red('Failed to revoke tokens'));
    console.error(chalk.dim(result.error));
    process.exit(1);
  }

  spinner.succeed(chalk.green('All tokens revoked successfully'));
  console.log(chalk.yellow('\nAll sessions have been terminated.'));
  console.log(chalk.dim('Run `entro-ng login` to authenticate again.'));
}
