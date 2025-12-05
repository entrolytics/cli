import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { api } from '../lib/api.js';
import { requireAuth } from '../lib/auth.js';
import { getConfig } from '../lib/config.js';

export async function linksListCommand(): Promise<void> {
  requireAuth();

  const spinner = ora('Fetching links...').start();
  const result = await api.getLinks();

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch links'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const links = result.data!;
  const config = getConfig();

  if (links.length === 0) {
    console.log(chalk.yellow('No links found.'));
    console.log(chalk.dim('Run `entro-ng links create <url>` to create one.'));
    return;
  }

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(links, null, 2));
    return;
  }

  const table = new Table({
    head: ['Name', 'Short URL', 'Target', 'Clicks', 'Created'],
    style: { head: ['cyan'] },
  });

  for (const link of links) {
    table.push([
      link.name,
      chalk.cyan(link.shortUrl),
      link.url.length > 35 ? `${link.url.substring(0, 35)}...` : link.url,
      link.clicks.toLocaleString(),
      new Date(link.createdAt).toLocaleDateString(),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`\nTotal: ${links.length} link(s)`));
}

interface LinkCreateOptions {
  slug?: string;
  name?: string;
}

export async function linksCreateCommand(url: string, options: LinkCreateOptions): Promise<void> {
  requireAuth();

  const spinner = ora('Creating short link...').start();
  const result = await api.createLink(url, options.name, options.slug);

  if (result.error) {
    spinner.fail(chalk.red('Failed to create link'));
    console.error(chalk.dim(result.error));
    return;
  }

  const link = result.data!;
  spinner.succeed(chalk.green('Link created!'));
  console.log();
  console.log(chalk.bold('Name:'), chalk.cyan(link.name));
  console.log(chalk.bold('Short URL:'), chalk.cyan(link.shortUrl));
  console.log(chalk.bold('Target:'), link.url);
  console.log(chalk.bold('ID:'), chalk.dim(link.id));
}

export async function linksStatsCommand(linkId: string): Promise<void> {
  requireAuth();

  const spinner = ora('Fetching link stats...').start();
  const result = await api.getLinkStats(linkId);

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch link stats'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const stats = result.data!;
  const config = getConfig();

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log(chalk.bold('Link Statistics'));
  console.log();

  const table = new Table({
    style: { head: ['cyan'] },
  });

  table.push(
    { 'Total Clicks': stats.visitors.value.toLocaleString() },
    { 'Unique Clicks': stats.pageviews.value.toLocaleString() },
  );

  console.log(table.toString());
}

export async function linksDeleteCommand(linkId: string): Promise<void> {
  requireAuth();

  const spinner = ora('Deleting link...').start();
  const result = await api.deleteLink(linkId);

  if (result.error) {
    spinner.fail(chalk.red('Failed to delete link'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.succeed(chalk.green('Link deleted'));
}
