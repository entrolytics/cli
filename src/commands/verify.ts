import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { requireAuth } from '../lib/auth.js';
import { readEnvFile } from '../utils/env.js';
import { detectProject, getEnvVarNames } from '../utils/project.js';

interface VerifyOptions {
  websiteId?: string;
  url?: string;
}

/**
 * Verify that tracking is working
 */
export async function verifyCommand(options: VerifyOptions = {}): Promise<void> {
  requireAuth();

  const cwd = process.cwd();
  console.log(chalk.bold('\n🔍 Verifying Entrolytics Setup\n'));

  // 1. Check environment variables
  const spinner = ora('Checking configuration...').start();
  const projectInfo = detectProject(cwd);
  const envVarNames = getEnvVarNames(projectInfo.framework || null);
  const env = readEnvFile(cwd);

  const websiteId = options.websiteId || env[envVarNames.websiteId];
  const host = env[envVarNames.host];

  if (!websiteId) {
    spinner.fail(chalk.red('Website ID not found'));
    console.log(chalk.dim(`Expected environment variable: ${chalk.cyan(envVarNames.websiteId)}`));
    console.log(chalk.dim(`Run ${chalk.cyan('entro-ng init')} to configure Entrolytics.`));
    process.exit(1);
  }

  spinner.text = 'Fetching website details...';

  // 2. Verify website exists
  const websiteResult = await api.getWebsite(websiteId!);

  if (websiteResult.error) {
    spinner.fail(chalk.red('Website not found'));
    console.error(chalk.dim(websiteResult.error));
    console.log(chalk.dim(`\nWebsite ID: ${chalk.cyan(websiteId)}`));
    console.log(chalk.dim(`Run ${chalk.cyan('entro-ng sites list')} to see your websites.`));
    process.exit(1);
  }

  const website = websiteResult.data!;
  spinner.succeed(chalk.green(`Found website: ${chalk.cyan(website.name)}`));

  // 3. Send test event
  spinner.start('Sending test event...');

  const testResult = await api.sendTestEvent(websiteId!);

  if (testResult.error) {
    spinner.fail(chalk.red('Failed to send test event'));
    console.error(chalk.dim(testResult.error));
    process.exit(1);
  }

  spinner.succeed(chalk.green('Test event sent successfully'));

  // 4. Check for recent activity (optional)
  spinner.start('Checking for recent activity...');

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const statsResult = await api.getStats(websiteId!, oneDayAgo, now);

  if (statsResult.error) {
    spinner.warn(chalk.yellow('Could not fetch recent stats'));
  } else {
    const stats = statsResult.data!;
    const hasActivity = stats.pageviews.value > 0;

    if (hasActivity) {
      spinner.succeed(
        chalk.green(
          `Recent activity detected: ${chalk.cyan(stats.pageviews.value)} pageviews, ${chalk.cyan(stats.visitors.value)} visitors`,
        ),
      );
    } else {
      spinner.info(chalk.blue('No recent activity detected'));
      console.log(chalk.dim('Visit your website to generate tracking events.'));
    }
  }

  // 5. Show configuration
  console.log(chalk.bold('\n✅ Configuration:\n'));
  console.log(`  Website: ${chalk.cyan(website.name)}`);
  console.log(`  Domain:  ${chalk.cyan(website.domain || 'Not set')}`);
  console.log(`  ID:      ${chalk.dim(websiteId)}`);
  if (host) {
    console.log(`  Host:    ${chalk.dim(host)}`);
  }

  // 6. Show next steps
  console.log(chalk.bold('\n📋 Next Steps:\n'));

  if (statsResult.data && statsResult.data.pageviews.value === 0) {
    console.log(chalk.dim('1. Make sure your application is running'));
    console.log(chalk.dim('2. Visit your website in a browser'));
    console.log(chalk.dim('3. Check the browser console for any errors'));
    console.log(chalk.dim(`4. Run ${chalk.cyan('entro-ng stats ' + websiteId)} to view analytics\n`));
  } else {
    console.log(
      chalk.green(
        `View your dashboard: ${chalk.cyan(host ? `${host}/websites/${websiteId}` : `https://ng.entrolytics.click/websites/${websiteId}`)}\n`,
      ),
    );
  }
}
