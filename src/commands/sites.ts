import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import * as api from '../lib/api.js';
import { displayAuthErrorHelp, isAuthError, requireAuth } from '../lib/auth.js';
import { getConfig } from '../lib/config.js';

export async function sitesListCommand(): Promise<void> {
  requireAuth();

  const spinner = ora('Fetching websites...').start();
  const result = await api.getWebsites();

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch websites'));
    console.error(chalk.dim(result.error));

    if (isAuthError(result.error, result.status)) {
      displayAuthErrorHelp();
    }

    return;
  }

  spinner.stop();

  const websites = result.data!;
  const config = getConfig();

  if (websites.length === 0) {
    console.log(chalk.yellow('No websites found.'));
    console.log(chalk.dim('Run `entro-ng sites add <domain>` to add one.'));
    return;
  }

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(websites, null, 2));
    return;
  }

  const table = new Table({
    head: ['ID', 'Domain', 'Name', 'Created'],
    style: { head: ['cyan'] },
  });

  for (const site of websites) {
    table.push([
      site.websiteId,
      site.domain,
      site.name,
      new Date(site.createdAt).toLocaleDateString(),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`\nTotal: ${websites.length} website(s)`));
}

export async function sitesAddCommand(domain: string): Promise<void> {
  requireAuth();

  const spinner = ora(`Adding ${domain}...`).start();
  const result = await api.createWebsite(domain);

  if (result.error) {
    spinner.fail(chalk.red('Failed to add website'));
    console.error(chalk.dim(result.error));

    if (isAuthError(result.error, result.status)) {
      displayAuthErrorHelp();
    }

    return;
  }

  const website = result.data!;
  spinner.succeed(chalk.green(`Website added: ${website.domain}`));
  console.log(chalk.dim(`Website ID: ${website.websiteId}`));
  console.log();
  console.log(chalk.bold('Next steps:'));
  console.log(`  1. Run ${chalk.cyan('entro-ng snippet')} to get the tracking code`);
  console.log(`  2. Add it to your website's <head> tag`);
  console.log(`  3. Run ${chalk.cyan(`entro-ng sites verify ${website.websiteId}`)} to confirm`);
}

export async function sitesRemoveCommand(websiteId: string): Promise<void> {
  requireAuth();

  const spinner = ora('Removing website...').start();
  const result = await api.deleteWebsite(websiteId);

  if (result.error) {
    spinner.fail(chalk.red('Failed to remove website'));
    console.error(chalk.dim(result.error));

    if (isAuthError(result.error, result.status)) {
      displayAuthErrorHelp();
    }

    return;
  }

  spinner.succeed(chalk.green('Website removed'));
}

export async function sitesVerifyCommand(websiteId: string): Promise<void> {
  requireAuth();

  const spinner = ora('Verifying tracking installation...').start();

  // Get website info first
  const siteResult = await api.getWebsite(websiteId);
  if (siteResult.error) {
    spinner.fail(chalk.red('Website not found'));
    console.error(chalk.dim(siteResult.error));

    if (isAuthError(siteResult.error, siteResult.status)) {
      displayAuthErrorHelp();
    }

    return;
  }

  const website = siteResult.data!;

  // Try to fetch the domain and check for tracking script
  try {
    const response = await fetch(`https://${website.domain}`, {
      headers: { 'User-Agent': 'EntrolyticsCLI/1.0' },
    });
    const html = await response.text();

    if (html.includes('entrolytics') || html.includes(websiteId)) {
      spinner.succeed(chalk.green('Tracking verified!'));
      console.log(chalk.dim('The Entrolytics tracking script is installed on your website.'));
    } else {
      spinner.warn(chalk.yellow('Tracking script not detected'));
      console.log(chalk.dim("Make sure you've added the tracking snippet to your website."));
      console.log(chalk.dim(`Run ${chalk.cyan('entro-ng snippet')} to get the code.`));
    }
  } catch {
    spinner.warn(chalk.yellow('Could not verify tracking'));
    console.log(chalk.dim(`Unable to fetch ${website.domain}. Verify manually.`));
  }
}

export async function sitesInfoCommand(websiteId: string): Promise<void> {
  requireAuth();

  const spinner = ora('Fetching website info...').start();
  const result = await api.getWebsite(websiteId);

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch website'));
    console.error(chalk.dim(result.error));

    if (isAuthError(result.error, result.status)) {
      displayAuthErrorHelp();
    }

    return;
  }

  spinner.stop();

  const website = result.data!;
  const config = getConfig();

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(website, null, 2));
    return;
  }

  console.log(chalk.bold('Website Details:'));
  console.log(`  ID: ${chalk.cyan(website.websiteId)}`);
  console.log(`  Domain: ${chalk.cyan(website.domain)}`);
  console.log(`  Name: ${chalk.cyan(website.name)}`);
  console.log(`  Created: ${chalk.cyan(new Date(website.createdAt).toLocaleString())}`);
  if (website.updatedAt) {
    console.log(`  Updated: ${chalk.cyan(new Date(website.updatedAt).toLocaleString())}`);
  }
  if (website.shareId) {
    console.log(`  Share ID: ${chalk.cyan(website.shareId)}`);
  }
}
