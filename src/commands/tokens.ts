import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { api } from '../lib/api.js';
import { requireAuth } from '../lib/auth.js';

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
    head: ['Token ID', 'Name', 'Created', 'Last Used', 'Expires'].map(h => chalk.cyan(h)),
    style: {
      head: [],
      border: ['dim'],
    },
  });

  for (const token of tokens as {
    id: string;
    name?: string | null;
    createdAt: string;
    lastUsedAt?: string | null;
    expiresAt: string;
  }[]) {
    const createdDate = new Date(token.createdAt).toLocaleString();
    const lastUsed = token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : 'Never';
    const expiresAt = token.expiresAt ? new Date(token.expiresAt).toLocaleString() : 'Unknown';
    const tokenIdShort = `${token.id.substring(0, 8)}...`;

    table.push([tokenIdShort, token.name || 'CLI Token', createdDate, lastUsed, expiresAt]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`\nTotal: ${tokens.length} active token(s)`));
}

export async function tokensRevokeCommand(tokenId?: string): Promise<void> {
  requireAuth();

  if (!tokenId) {
    console.error(chalk.red('Please provide the token ID to revoke.'));
    console.log(chalk.dim('Tip: run `entro-ng tokens list` to see active tokens.'));
    process.exit(1);
  }

  const spinner = ora(`Revoking token ${tokenId.substring(0, 8)}...`).start();

  const result = await api.revokeCliToken(tokenId);

  if (result.error) {
    spinner.fail(chalk.red('Failed to revoke token'));
    console.error(chalk.dim(result.error));
    process.exit(1);
  }

  spinner.succeed(chalk.green('Token revoked successfully'));
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
