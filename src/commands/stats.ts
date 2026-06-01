import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import * as api from '../lib/api.js';
import { displayAuthErrorHelp, isAuthError, requireAuth } from '../lib/auth.js';
import { getConfig, getDefaultSiteId } from '../lib/config.js';

interface StatsOptions {
  period: string;
}

function getPeriodRange(period: string): { startAt: number; endAt: number } {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  switch (period) {
    case '7d':
      return { startAt: now - 7 * day, endAt: now };
    case '30d':
      return { startAt: now - 30 * day, endAt: now };
    case 'yesterday': {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      return { startAt: yesterday.getTime(), endAt: endOfYesterday.getTime() };
    }
    default: {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { startAt: today.getTime(), endAt: now };
    }
  }
}

function formatChange(change: number): string {
  if (change > 0) return chalk.green(`+${change}%`);
  if (change < 0) return chalk.red(`${change}%`);
  return chalk.dim('0%');
}

export async function statsCommand(
  websiteId: string | undefined,
  options: StatsOptions,
): Promise<void> {
  requireAuth();

  const siteId = websiteId || getDefaultSiteId();
  if (!siteId) {
    console.log(chalk.yellow('No website specified.'));
    console.log(chalk.dim('Provide a website ID or set a default with:'));
    console.log(chalk.dim('  entro-ng config set defaultSiteId <website-id>'));
    return;
  }

  const spinner = ora('Fetching stats...').start();
  const { startAt, endAt } = getPeriodRange(options.period);
  const result = await api.getStats(siteId, startAt, endAt);

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch stats'));
    console.error(chalk.dim(result.error));

    if (isAuthError(result.error, result.status)) {
      displayAuthErrorHelp();
    }

    return;
  }

  spinner.stop();

  const stats = result.data!;
  const config = getConfig();

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log(chalk.bold(`Analytics Overview (${options.period})`));
  console.log();

  const table = new Table({
    style: { head: ['cyan'] },
  });

  table.push(
    { Visitors: `${stats.visitors.value.toLocaleString()} ${formatChange(stats.visitors.change)}` },
    {
      'Page Views': `${stats.pageviews.value.toLocaleString()} ${formatChange(stats.pageviews.change)}`,
    },
    { Sessions: `${stats.visits.value.toLocaleString()} ${formatChange(stats.visits.change)}` },
    { 'Bounce Rate': `${Math.round(stats.bounces.value)}% ${formatChange(stats.bounces.change)}` },
  );

  console.log(table.toString());
}

export async function realtimeCommand(websiteId: string | undefined): Promise<void> {
  requireAuth();

  const siteId = websiteId || getDefaultSiteId();
  if (!siteId) {
    console.log(chalk.yellow('No website specified.'));
    return;
  }

  const spinner = ora('Fetching live visitors...').start();
  const result = await api.getRealtimeVisitors(siteId);

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch realtime data'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const count = result.data?.count || 0;
  console.log(chalk.bold('Live Visitors:'), chalk.cyan.bold(count.toString()));
}

interface TopOptions {
  limit: string;
}

export async function topCommand(
  type: string,
  websiteId: string | undefined,
  options: TopOptions,
): Promise<void> {
  requireAuth();

  const siteId = websiteId || getDefaultSiteId();
  if (!siteId) {
    console.log(chalk.yellow('No website specified.'));
    return;
  }

  const limit = parseInt(options.limit, 10);
  const { startAt, endAt } = getPeriodRange('30d');

  let result: Awaited<ReturnType<typeof api.getTopPages>>;
  let title: string;

  const spinner = ora('Fetching data...').start();

  switch (type) {
    case 'pages':
      result = await api.getTopPages(siteId, startAt, endAt, limit);
      title = 'Top Pages';
      break;
    case 'referrers':
      result = await api.getTopReferrers(siteId, startAt, endAt, limit);
      title = 'Top Referrers';
      break;
    case 'countries':
      result = await api.getTopCountries(siteId, startAt, endAt, limit);
      title = 'Top Countries';
      break;
    default:
      spinner.fail(chalk.red(`Unknown type: ${type}`));
      console.log(chalk.dim('Valid types: pages, referrers, countries'));
      return;
  }

  if (result.error) {
    spinner.fail(chalk.red(`Failed to fetch ${type}`));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const data = result.data!;
  const config = getConfig();

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(chalk.bold(title));
  console.log();

  if (data.length === 0) {
    console.log(chalk.dim('No data available for this period.'));
    return;
  }

  const table = new Table({
    head: [type === 'pages' ? 'URL' : type === 'countries' ? 'Country' : 'Source', 'Views'],
    style: { head: ['cyan'] },
  });

  for (const item of data) {
    table.push([item.x || '(none)', item.y.toLocaleString()]);
  }

  console.log(table.toString());
}
