import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { displayAuthErrorHelp, isAuthError, isAuthenticated } from '../lib/auth.js';
import { getApiHost } from '../lib/config.js';
import { hasEnvVars, writeEnvFile } from '../utils/env.js';
import { detectProject, getEnvVarNames, getPackageName } from '../utils/project.js';
import { loginCommand } from './auth.js';

interface InitOptions {
  framework?: string;
  domain?: string;
  install?: boolean;
  skipInstall?: boolean;
  websiteId?: string;
  token?: string; // NEW: Token-based setup from dashboard
}

/**
 * Initialize Entrolytics in a project
 */
export async function initCommand(options: InitOptions = {}): Promise<void> {
  const cwd = process.cwd();

  console.log(chalk.bold('\n🚀 Entrolytics Setup\n'));

  // Check for token-based setup first (from dashboard onboarding)
  if (options.token) {
    await tokenBasedSetup(options.token, cwd, options);
    return;
  }

  // 1. Ensure authenticated (for OAuth flow)
  if (!isAuthenticated()) {
    console.log(chalk.yellow('You need to log in first.\n'));
    await loginCommand();
    console.log(); // Add spacing
  }

  // 2. Detect project
  const spinner = ora('Detecting project...').start();
  const projectInfo = detectProject(cwd);

  if (!projectInfo.hasPackageJson) {
    spinner.fail(chalk.red('No package.json found in current directory'));
    console.log(chalk.dim("Make sure you're in a JavaScript/TypeScript project root."));
    process.exit(1);
  }

  const framework = options.framework || projectInfo.framework || 'html';
  spinner.succeed(
    chalk.green(
      `Detected ${framework === 'html' ? 'generic web' : framework.toUpperCase()} project${projectInfo.name ? `: ${chalk.cyan(projectInfo.name)}` : ''}`,
    ),
  );

  // 3. Check if already configured
  const envVarNames = getEnvVarNames(framework);
  if (hasEnvVars(cwd, [envVarNames.websiteId]) && !options.websiteId) {
    console.log(chalk.yellow('\n⚠️  Entrolytics is already configured in this project.'));
    console.log(chalk.dim('Run `entro-ng update` to refresh your configuration.'));
    process.exit(0);
  }

  // 4. Get or create website
  let websiteId = options.websiteId;

  if (!websiteId) {
    spinner.start('Setting up website...');

    const domain = options.domain || projectInfo.domain || projectInfo.name || 'my-website';

    // Try to find existing website by domain
    const sitesResult = await api.getWebsites();

    if (sitesResult.error) {
      spinner.fail(chalk.red('Failed to fetch websites'));
      console.error(chalk.dim(sitesResult.error));

      // Handle auth errors with helpful guidance
      if (isAuthError(sitesResult.error, sitesResult.status)) {
        displayAuthErrorHelp();
        console.log(chalk.dim('Then run:'));
        console.log(chalk.cyan('  entro-ng init\n'));
      }

      process.exit(1);
    }

    const existingSite = sitesResult.data?.find(
      site => site.domain === domain || site.name === domain || site.name === projectInfo.name,
    );

    if (existingSite) {
      websiteId = existingSite.websiteId;
      spinner.succeed(chalk.green(`Found existing website: ${chalk.cyan(existingSite.name)}`));
    } else {
      // Create new website
      const createResult = await api.createWebsite(domain, projectInfo.name || domain);

      if (createResult.error) {
        spinner.fail(chalk.red('Failed to create website'));
        console.error(chalk.dim(createResult.error));
        process.exit(1);
      }

      websiteId = createResult.data!.websiteId;
      spinner.succeed(chalk.green(`Created website: ${chalk.cyan(projectInfo.name || domain)}`));
    }
  }

  // 5. Write environment variables
  spinner.start('Configuring environment...');

  const host = getApiHost();
  const envVars: Record<string, string> = {
    [envVarNames.websiteId]: websiteId!,
    [envVarNames.host]: host,
  };

  try {
    writeEnvFile(cwd, envVars);
    spinner.succeed(chalk.green('Updated .env.local'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to write environment variables'));
    console.error(chalk.dim(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }

  // 6. Install package (if requested)
  const packageName = getPackageName(framework);

  if (packageName && !options.skipInstall) {
    const shouldInstall =
      options.install !== undefined
        ? options.install
        : await promptInstall(packageName, projectInfo.packageManager || 'npm');

    if (shouldInstall) {
      spinner.start(`Installing ${packageName}...`);

      const success = await installPackage(packageName, projectInfo.packageManager || 'npm', cwd);

      if (success) {
        spinner.succeed(chalk.green(`Installed ${packageName}`));
      } else {
        spinner.warn(chalk.yellow(`Failed to install ${packageName}`));
        console.log(chalk.dim(`You can install it manually with:`));
        console.log(chalk.cyan(`  ${projectInfo.packageManager || 'npm'} install ${packageName}`));
      }
    }
  }

  // 7. Show next steps
  console.log(chalk.bold.green('\n✅ Entrolytics configured successfully!\n'));

  console.log(chalk.bold('Next steps:\n'));

  if (packageName) {
    console.log(getIntegrationCode(framework, websiteId!, host));
  } else {
    // HTML snippet
    console.log(chalk.dim('Add this script tag to your HTML:'));
    console.log(
      chalk.cyan(
        `\n  <script defer src="${host}/script.js" data-website-id="${websiteId}"></script>\n`,
      ),
    );
  }

  console.log(chalk.dim('\nRun your development server and visit your site to start tracking.'));
  console.log(chalk.dim(`Verify tracking with: ${chalk.cyan('entro-ng verify')}\n`));
}

/**
 * Token-based setup (from dashboard)
 */
async function tokenBasedSetup(token: string, cwd: string, options: InitOptions): Promise<void> {
  const spinner = ora('Validating setup token...').start();

  try {
    // Validate token with API
    const apiHost = getApiHost();
    const response = await fetch(`${apiHost}/api/cli/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      spinner.fail(chalk.red('Token validation failed'));
      console.log(chalk.yellow(`\nError: ${error.error}`));

      if (error.error === 'Token expired') {
        console.log(chalk.dim('\n💡 Your setup token has expired.'));
        console.log(chalk.dim('Generate a new one from your dashboard:'));
        console.log(chalk.cyan('   https://ng.entrolytics.click/onboarding/install\n'));
      } else if (error.error === 'Token already used') {
        console.log(chalk.dim('\n💡 This token has already been used.'));
        console.log(chalk.dim('You can run without a token to continue setup:\n'));
        console.log(chalk.cyan('   npx @entrolytics/cli init\n'));
      }

      process.exit(1);
    }

    const data = await response.json();
    spinner.succeed(chalk.green('Token validated!'));

    // Extract website info
    const { website, apiHost: configuredApiHost } = data;
    console.log(chalk.dim(`\n✓ Website: ${website.name}`));
    if (website.domain) {
      console.log(chalk.dim(`✓ Domain: ${website.domain}`));
    }

    // Detect project
    spinner.start('Detecting project...');
    const projectInfo = detectProject(cwd);

    if (!projectInfo.hasPackageJson) {
      spinner.warn(chalk.yellow('No package.json found'));
      console.log(chalk.dim('Detected as: HTML/generic web project'));
    }

    const framework = options.framework || projectInfo.framework || 'html';
    spinner.succeed(chalk.green(`Detected ${chalk.bold(framework.toUpperCase())} project`));

    // Write environment variables
    spinner.start('Configuring environment...');
    const envVarNames = getEnvVarNames(framework);
    const envVars: Record<string, string> = {
      [envVarNames.websiteId]: website.id || website.websiteId,
      [envVarNames.host]: configuredApiHost,
    };

    try {
      writeEnvFile(cwd, envVars);
      const envFile = envVarNames.envFile || '.env.local';
      spinner.succeed(chalk.green(`Updated ${envFile}`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to write environment variables'));
      console.error(chalk.dim(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }

    // Install package
    const packageName = getPackageName(framework);
    if (packageName && options.skipInstall !== true) {
      const shouldInstall = options.install !== false;

      if (shouldInstall) {
        spinner.start(`Installing ${packageName}...`);

        const success = await installPackage(packageName, projectInfo.packageManager || 'npm', cwd);

        if (success) {
          spinner.succeed(chalk.green(`Installed ${packageName}`));
        } else {
          spinner.warn(chalk.yellow(`Failed to install ${packageName}`));
          console.log(chalk.dim(`You can install it manually with:`));
          console.log(
            chalk.cyan(`  ${projectInfo.packageManager || 'npm'} install ${packageName}`),
          );
        }
      }
    }

    // Show success message
    console.log(chalk.bold.green('\n✅ Setup complete!\n'));

    // Show integration code
    if (packageName) {
      console.log(
        getIntegrationCode(framework, website.id || website.websiteId, configuredApiHost),
      );
    } else {
      // HTML snippet
      console.log(chalk.bold('Add this script to your HTML:\n'));
      console.log(
        chalk.cyan(
          `  <script defer src="${configuredApiHost}/script.js" data-website-id="${website.id || website.websiteId}"></script>\n`,
        ),
      );
    }

    // Show next steps
    console.log(chalk.dim('Run your development server and visit your site to start tracking.'));
    console.log(chalk.dim(`Verify tracking with: ${chalk.cyan('entro-ng verify')}\n`));
  } catch (error) {
    spinner.fail(chalk.red('Setup failed'));
    console.error(chalk.dim('\nError details:'));
    console.error(chalk.dim(error instanceof Error ? error.message : 'Unknown error'));

    console.log(chalk.yellow('\n💡 Troubleshooting:'));
    console.log(chalk.dim('  • Check your internet connection'));
    console.log(chalk.dim('  • Verify the API is accessible'));
    console.log(chalk.dim('  • Try generating a new token'));
    console.log(chalk.dim('  • Or run without a token: npx @entrolytics/cli init\n'));

    process.exit(1);
  }
}

/**
 * Prompt user to install package
 */
async function promptInstall(packageName: string, packageManager: string): Promise<boolean> {
  // For now, auto-install. In the future, we can add prompts library
  console.log(chalk.dim(`\nWould you like to install ${packageName}? (Y/n)`));
  // TODO: Add proper prompt, for now return true
  return true;
}

/**
 * Install npm package
 */
async function installPackage(
  packageName: string,
  packageManager: string,
  cwd: string,
): Promise<boolean> {
  return new Promise(resolve => {
    const args =
      packageManager === 'npm'
        ? ['install', packageName]
        : packageManager === 'yarn'
          ? ['add', packageName]
          : ['add', packageName]; // pnpm, bun

    const child = spawn(packageManager, args, {
      cwd,
      stdio: 'pipe',
    });

    let output = '';

    child.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    child.on('close', (code: number | null) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get integration code for framework
 */
function getIntegrationCode(framework: string, websiteId: string, host: string): string {
  const examples: Record<string, string> = {
    nextjs: `${chalk.dim('1. Add to app/layout.tsx or app/layout.jsx:\n')}
${chalk.cyan("import { Analytics } from '@entrolytics/nextjs-sdk';")}

${chalk.cyan('export default function RootLayout({ children }) {')}
${chalk.cyan('  return (')}
${chalk.cyan('    <html>')}
${chalk.cyan('      <body>')}
${chalk.cyan('        {children}')}
${chalk.cyan('        <Analytics />')}
${chalk.cyan('      </body>')}
${chalk.cyan('    </html>')}
${chalk.cyan('  );')}
${chalk.cyan('}')}\n
${chalk.dim('The Analytics component automatically reads from your .env.local file.')}\n`,

    react: `${chalk.dim('1. Add to your root component (e.g., App.jsx):\n')}
${chalk.cyan("import { Analytics } from '@entrolytics/react-sdk';")}

${chalk.cyan('function App() {')}
${chalk.cyan('  return (')}
${chalk.cyan('    <>')}
${chalk.cyan('      <YourApp />')}
${chalk.cyan('      <Analytics />')}
${chalk.cyan('    </>')}
${chalk.cyan('  );')}
${chalk.cyan('}')}\n
${chalk.dim('The Analytics component automatically reads from your .env file.')}\n`,

    vue: `${chalk.dim('1. Add to your main.js or main.ts:\n')}
${chalk.cyan("import { createEntrolytics } from '@entrolytics/vue-sdk';")}

${chalk.cyan('const app = createApp(App);')}
${chalk.cyan('app.use(createEntrolytics());')}\n
${chalk.dim('The plugin automatically reads from your .env file.')}\n`,

    svelte: `${chalk.dim('1. Add to your +layout.svelte:\n')}
${chalk.cyan('<script>')}
${chalk.cyan("  import { initEntrolytics } from '@entrolytics/svelte-sdk';")}
${chalk.cyan('  initEntrolytics();')}
${chalk.cyan('</script>')}

${chalk.cyan('<slot />')}\n
${chalk.dim('The init function automatically reads from your .env file.')}\n`,

    astro: `${chalk.dim('1. Add to astro.config.mjs:\n')}
${chalk.cyan("import entrolytics from '@entrolytics/astro-sdk';")}

${chalk.cyan('export default defineConfig({')}
${chalk.cyan('  integrations: [entrolytics()]')}
${chalk.cyan('});')}\n
${chalk.dim('The integration automatically reads from your .env file.')}\n`,
  };

  return examples[framework] || examples.react || '';
}
