import chalk from 'chalk';
import { Command } from 'commander';
import { loginCommand, logoutCommand, switchCommand, whoamiCommand } from './commands/auth.js';
import { configCommand } from './commands/config.js';
import { deploymentsCommand, trackDeploymentCommand } from './commands/deployments.js';
import { formFieldsCommand, formsCommand } from './commands/forms.js';
import { initCommand } from './commands/init.js';
import { snippetCommand, testEventCommand } from './commands/integration.js';
import {
  linksCreateCommand,
  linksDeleteCommand,
  linksListCommand,
  linksStatsCommand,
} from './commands/links.js';
import {
  getModeCommand,
  routingHealthCommand,
  routingStatsCommand,
  setModeCommand,
} from './commands/routing.js';
import {
  sitesAddCommand,
  sitesInfoCommand,
  sitesListCommand,
  sitesRemoveCommand,
  sitesVerifyCommand,
} from './commands/sites.js';
import { realtimeCommand, statsCommand, topCommand } from './commands/stats.js';
import {
  tokensListCommand,
  tokensRevokeAllCommand,
  tokensRevokeCommand,
} from './commands/tokens.js';
import { updateCommand } from './commands/update.js';
import { verifyCommand } from './commands/verify.js';
import { vitalsCommand, vitalsPageCommand } from './commands/vitals.js';
import { description, version } from './version.js';

const program = new Command();

program
  .name('entro-ng')
  .description(description)
  .version(version, '-v, --version', 'Display version number');

// Setup/initialization commands
program
  .command('init')
  .description('Initialize Entrolytics in your project')
  .option('-f, --framework <framework>', 'Framework (nextjs, react, vue, svelte, astro)')
  .option('-d, --domain <domain>', 'Website domain')
  .option('-t, --token <token>', 'Setup token from dashboard (for quick onboarding)')
  .option('--install', 'Install package automatically')
  .option('--skip-install', 'Skip package installation')
  .option('-w, --website-id <id>', 'Use existing website ID')
  .action(initCommand);

program
  .command('verify')
  .description('Verify tracking is working')
  .option('-w, --website-id <id>', 'Website ID to verify')
  .action(verifyCommand);

program
  .command('update')
  .description('Update Entrolytics configuration')
  .option('-w, --website-id <id>', 'New website ID')
  .option('--host <host>', 'New API host')
  .action(updateCommand);

// Authentication commands
program.command('login').description('Authenticate with Entrolytics').action(loginCommand);

program.command('logout').description('Clear local credentials').action(logoutCommand);

program
  .command('whoami')
  .description('Display current user and organization')
  .action(whoamiCommand);

program.command('switch <org>').description('Switch active organization').action(switchCommand);

// Token management commands
const tokens = program.command('tokens').description('Manage CLI access tokens');

tokens.command('list').description('List all active CLI tokens').action(tokensListCommand);

tokens
  .command('revoke <token-id>')
  .description('Revoke a specific CLI token by ID')
  .action(tokensRevokeCommand);

tokens
  .command('revoke-all')
  .description('Revoke all CLI tokens for your account')
  .action(tokensRevokeAllCommand);

// Sites commands
const sites = program.command('sites').description('Manage websites');

sites.command('list').description('List all websites').action(sitesListCommand);

sites.command('add <domain>').description('Add new website').action(sitesAddCommand);

sites.command('remove <website-id>').description('Remove website').action(sitesRemoveCommand);

sites
  .command('verify <website-id>')
  .description('Verify tracking is installed')
  .action(sitesVerifyCommand);

sites.command('info <website-id>').description('Show website details').action(sitesInfoCommand);

sites
  .command('set-mode <website-id> <mode>')
  .description('Set website ingest mode (auto, node, edge)')
  .action(setModeCommand);

sites
  .command('get-mode <website-id>')
  .description('Get website ingest mode')
  .action(getModeCommand);

// Routing commands
const routing = program.command('routing').description('Manage routing and infrastructure');

routing.command('health').description('Check routing health status').action(routingHealthCommand);

routing
  .command('stats')
  .description('View routing statistics')
  .option('--start <date>', 'Start date (YYYY-MM-DD)')
  .option('--end <date>', 'End date (YYYY-MM-DD)')
  .action(routingStatsCommand);

// Stats commands
program
  .command('stats [website-id]')
  .description("Today's analytics overview")
  .option('-p, --period <period>', 'Time period (today, 7d, 30d)', 'today')
  .action(statsCommand);

program.command('realtime [website-id]').description('Live visitor count').action(realtimeCommand);

program
  .command('top <type> [website-id]')
  .description('Top pages, referrers, or countries')
  .option('-l, --limit <number>', 'Number of results', '10')
  .action(topCommand);

// Links commands
const links = program.command('links').description('Manage short links');

links.command('list').description('List all short links').action(linksListCommand);

links
  .command('create <url>')
  .description('Create short link')
  .option('-s, --slug <slug>', 'Custom slug')
  .option('-n, --name <name>', 'Link name')
  .action(linksCreateCommand);

links.command('stats <link-id>').description('Link click analytics').action(linksStatsCommand);

links.command('delete <link-id>').description('Delete link').action(linksDeleteCommand);

// Integration commands
program
  .command('snippet')
  .description('Get tracking snippet')
  .option('-f, --framework <framework>', 'Framework (next, react, astro, vue, html)', 'html')
  .action(snippetCommand);

program
  .command('test-event')
  .description('Send test event to verify setup')
  .requiredOption('-s, --site <website-id>', 'Website ID')
  .action(testEventCommand);

// Config commands
const config = program.command('config').description('Manage configuration');

config
  .command('set <key> <value>')
  .description('Set config option')
  .action((key, value) => configCommand('set', key, value));

config
  .command('get <key>')
  .description('Get config value')
  .action(key => configCommand('get', key));

config
  .command('list')
  .description('List all config')
  .action(() => configCommand('list'));

// Phase 2: Web Vitals commands
const vitals = program.command('vitals').description('Web Vitals performance metrics');

vitals
  .command('overview [website-id]')
  .description('Show Web Vitals overview')
  .option('-p, --period <period>', 'Time period (24h, 7d, 30d)', '24h')
  .action(vitalsCommand);

vitals
  .command('pages [website-id]')
  .description('Show Web Vitals by page')
  .option('-p, --period <period>', 'Time period', '24h')
  .option('-l, --limit <number>', 'Number of pages', '20')
  .action(vitalsPageCommand);

// Phase 2: Form Analytics commands
const forms = program.command('forms').description('Form analytics and conversions');

forms
  .command('list [website-id]')
  .description('List form conversions')
  .option('-p, --period <period>', 'Time period (24h, 7d, 30d)', '7d')
  .action(formsCommand);

forms
  .command('fields <form-id> [website-id]')
  .description('Show field-level metrics for a form')
  .option('-p, --period <period>', 'Time period', '7d')
  .action(formFieldsCommand);

// Phase 2: Deployment Tracking commands
const deployments = program
  .command('deployments')
  .description('Deployment tracking and comparison');

deployments
  .command('list [website-id]')
  .description('List recent deployments')
  .option('-p, --period <period>', 'Time period (7d, 30d, 90d)', '30d')
  .option('-l, --limit <number>', 'Number of deployments', '20')
  .action(deploymentsCommand);

deployments
  .command('track <deploy-id> [website-id]')
  .description('Record a new deployment')
  .option('-s, --source <source>', 'Deployment source (vercel, netlify, github, custom)', 'custom')
  .option('--sha <sha>', 'Git commit SHA')
  .option('--branch <branch>', 'Git branch name')
  .option('--url <url>', 'Deployment URL')
  .option('--env <environment>', 'Environment (production, staging, preview)')
  .action(trackDeploymentCommand);

// Error handling
program.configureOutput({
  outputError: (str, write) => write(chalk.red(str)),
});

// Parse arguments
program.parse();
