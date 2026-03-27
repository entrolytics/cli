import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { api } from '../lib/api.js';
import { requireAuth } from '../lib/auth.js';
import { getConfig, getDefaultSiteId } from '../lib/config.js';
import type { DeploymentSource } from '../lib/types.js';

interface DeploymentsOptions {
  period: string;
  limit: string;
}

function getPeriodRange(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  switch (period) {
    case '7d':
      return { startDate: new Date(now.getTime() - 7 * day), endDate: now };
    case '30d':
      return { startDate: new Date(now.getTime() - 30 * day), endDate: now };
    case '90d':
      return { startDate: new Date(now.getTime() - 90 * day), endDate: now };
    default:
      return { startDate: new Date(now.getTime() - 30 * day), endDate: now };
  }
}

/**
 * List deployments for a website
 */
export async function deploymentsCommand(
  websiteId: string | undefined,
  options: DeploymentsOptions,
): Promise<void> {
  requireAuth();

  const siteId = websiteId || getDefaultSiteId();
  if (!siteId) {
    console.log(chalk.yellow('No website specified.'));
    console.log(chalk.dim('Provide a website ID or set a default with:'));
    console.log(chalk.dim('  entro-ng config set defaultSiteId <website-id>'));
    return;
  }

  const limit = parseInt(options.limit, 10);
  const spinner = ora('Fetching deployments...').start();
  const { startDate, endDate } = getPeriodRange(options.period);
  const result = await api.getDeployments(siteId, startDate, endDate, limit);

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch deployments'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const deployments = result.data!;
  const config = getConfig();

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(deployments, null, 2));
    return;
  }

  console.log(chalk.bold(`Deployments (${options.period})`));
  console.log();

  if (deployments.length === 0) {
    console.log(chalk.dim('No deployments recorded for this period.'));
    console.log(chalk.dim('Track deployments with: entro-ng deployments track <deploy-id>'));
    return;
  }

  const table = new Table({
    head: ['Deploy ID', 'Branch', 'Source', 'Date', 'Pageviews'],
    style: { head: ['cyan'] },
    colWidths: [15, 18, 12, 20, 12],
  });

  for (const deploy of deployments) {
    const date = new Date(deploy.deployedAt);
    table.push([
      deploy.deployId.substring(0, 12),
      deploy.gitBranch || chalk.dim('(none)'),
      deploy.source,
      date.toLocaleDateString() +
        ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      deploy.pageviews.toLocaleString(),
    ]);
  }

  console.log(table.toString());
}

interface TrackOptions {
  source: string;
  sha?: string;
  branch?: string;
  url?: string;
  env?: string;
}

/**
 * Track a new deployment
 */
export async function trackDeploymentCommand(
  deployId: string,
  websiteId: string | undefined,
  options: TrackOptions,
): Promise<void> {
  requireAuth();

  const siteId = websiteId || getDefaultSiteId();
  if (!siteId) {
    console.log(chalk.yellow('No website specified.'));
    return;
  }

  const spinner = ora('Recording deployment...').start();

  const result = await api.trackDeployment(siteId, deployId, options.source as DeploymentSource, {
    gitSha: options.sha,
    gitBranch: options.branch,
    deployUrl: options.url,
    environment: options.env,
  });

  if (result.error) {
    spinner.fail(chalk.red('Failed to record deployment'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.succeed(chalk.green('Deployment recorded successfully'));
  console.log();
  console.log(chalk.dim('Deploy ID:'), chalk.bold(deployId));
  console.log(chalk.dim('Source:'), options.source);
  if (options.branch) console.log(chalk.dim('Branch:'), options.branch);
  if (options.sha) console.log(chalk.dim('Commit:'), options.sha);
  if (options.env) console.log(chalk.dim('Environment:'), options.env);
}
