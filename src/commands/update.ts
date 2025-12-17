import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { requireAuth } from '../lib/auth.js';
import { getApiHost } from '../lib/config.js';
import { readEnvFile, writeEnvFile } from '../utils/env.js';
import { detectProject, getEnvVarNames } from '../utils/project.js';

interface UpdateOptions {
  websiteId?: string;
  host?: string;
}

/**
 * Update Entrolytics configuration
 */
export async function updateCommand(options: UpdateOptions = {}): Promise<void> {
  requireAuth();

  const cwd = process.cwd();
  console.log(chalk.bold('\n🔄 Updating Entrolytics Configuration\n'));

  // 1. Check current configuration
  const spinner = ora('Checking current configuration...').start();
  const projectInfo = detectProject(cwd);
  const envVarNames = getEnvVarNames(projectInfo.framework || null);
  const currentEnv = readEnvFile(cwd);

  const currentWebsiteId = currentEnv[envVarNames.websiteId];
  const currentHost = currentEnv[envVarNames.host];

  if (!currentWebsiteId && !options.websiteId) {
    spinner.fail(chalk.red('No Entrolytics configuration found'));
    console.log(chalk.dim(`Run ${chalk.cyan('entro-ng init')} to set up Entrolytics.`));
    process.exit(1);
  }

  spinner.succeed(chalk.green('Found existing configuration'));

  // 2. Determine what to update
  const newWebsiteId = options.websiteId || currentWebsiteId;
  const newHost = options.host || getApiHost();

  // 3. Verify website exists
  if (newWebsiteId) {
    spinner.start('Verifying website...');
    const websiteResult = await api.getWebsite(newWebsiteId);

    if (websiteResult.error) {
      spinner.fail(chalk.red('Website not found'));
      console.error(chalk.dim(websiteResult.error));
      console.log(
        chalk.dim(`\nRun ${chalk.cyan('entro-ng sites list')} to see available websites.`),
      );
      process.exit(1);
    }

    const website = websiteResult.data!;
    spinner.succeed(chalk.green(`Verified website: ${chalk.cyan(website.name)}`));
  }

  // 4. Update environment variables
  spinner.start('Updating configuration...');

  const updatedEnv: Record<string, string> = {};

  if (newWebsiteId) {
    updatedEnv[envVarNames.websiteId] = newWebsiteId;
  }

  if (newHost && newHost !== currentHost) {
    updatedEnv[envVarNames.host] = newHost;
  }

  try {
    writeEnvFile(cwd, updatedEnv);
    spinner.succeed(chalk.green('Updated .env.local'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to update configuration'));
    console.error(chalk.dim(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }

  // 5. Show summary
  console.log(chalk.bold('\n✅ Configuration Updated:\n'));

  if (newWebsiteId) {
    console.log(`  Website ID: ${chalk.cyan(newWebsiteId)}`);
    if (currentWebsiteId && currentWebsiteId !== newWebsiteId) {
      console.log(chalk.dim(`  (was: ${currentWebsiteId})`));
    }
  }

  if (newHost) {
    console.log(`  Host:       ${chalk.cyan(newHost)}`);
    if (currentHost && currentHost !== newHost) {
      console.log(chalk.dim(`  (was: ${currentHost})`));
    }
  }

  console.log(chalk.dim('\nRestart your development server for changes to take effect.\n'));
}
