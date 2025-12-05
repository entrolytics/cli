import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { api } from '../lib/api.js';
import { requireAuth } from '../lib/auth.js';
import { getConfig } from '../lib/config.js';
import type { IngestMode } from '../lib/types.js';

export async function setModeCommand(websiteId: string, mode: string): Promise<void> {
  requireAuth();

  // Validate mode
  const validModes: IngestMode[] = ['auto', 'node', 'edge'];
  if (!validModes.includes(mode as IngestMode)) {
    console.error(chalk.red(`Invalid mode: ${mode}`));
    console.log(chalk.dim('Valid modes: auto, node, edge'));
    return;
  }

  const spinner = ora(`Setting ingest mode to ${mode}...`).start();
  const result = await api.setWebsiteMode(websiteId, mode as IngestMode);

  if (result.error) {
    spinner.fail(chalk.red('Failed to set ingest mode'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.succeed(chalk.green(`Ingest mode set to ${mode}`));
  console.log();
  console.log(chalk.bold('Mode details:'));

  if (mode === 'auto') {
    console.log(chalk.dim('  Intelligent routing based on your plan:'));
    console.log(chalk.dim('  • Free/Pro plans → Edge runtime (sub-50ms)'));
    console.log(chalk.dim('  • Business/Enterprise → Node.js runtime (ClickHouse)'));
  } else if (mode === 'edge') {
    console.log(chalk.dim('  Edge runtime (fastest):'));
    console.log(chalk.dim('  • Sub-50ms global latency'));
    console.log(chalk.dim('  • Limited: No ClickHouse export, basic geo data'));
  } else {
    console.log(chalk.dim('  Node.js runtime (full-featured):'));
    console.log(chalk.dim('  • ClickHouse export support'));
    console.log(chalk.dim('  • MaxMind GeoIP (city-level accuracy)'));
    console.log(chalk.dim('  • Latency: 50-150ms (regional)'));
  }
}

export async function getModeCommand(websiteId: string): Promise<void> {
  requireAuth();

  const spinner = ora('Fetching ingest mode...').start();
  const result = await api.getWebsiteMode(websiteId);

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch ingest mode'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const config = getConfig();
  const modeConfig = result.data!;

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(modeConfig, null, 2));
    return;
  }

  console.log(chalk.bold('Website Ingest Mode:'));
  console.log(`  Mode: ${chalk.cyan(modeConfig.ingestMode)}`);
  console.log();

  if (modeConfig.ingestMode === 'auto') {
    console.log(chalk.dim('Auto mode uses intelligent routing:'));
    console.log(chalk.dim('  • Free/Pro → Edge runtime'));
    console.log(chalk.dim('  • Business/Enterprise → Node.js runtime'));
  } else if (modeConfig.ingestMode === 'edge') {
    console.log(chalk.dim('Edge runtime: Sub-50ms latency, basic features'));
  } else {
    console.log(chalk.dim('Node.js runtime: Full features, ClickHouse export'));
  }
}

export async function routingHealthCommand(): Promise<void> {
  requireAuth();

  const spinner = ora('Checking routing health...').start();
  const result = await api.getRoutingHealth();

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch routing health'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const health = result.data!;
  const config = getConfig();

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(health, null, 2));
    return;
  }

  // Overall status
  const statusColor = health.status === 'ok' ? chalk.green : health.status === 'degraded' ? chalk.yellow : chalk.red;
  console.log(chalk.bold('Routing Health:'));
  console.log(`  Status: ${statusColor(health.status.toUpperCase())}`);
  console.log();

  // Table for endpoint health
  const table = new Table({
    head: ['Endpoint', 'Status', 'Latency'],
    style: { head: ['cyan'] },
  });

  const edgeStatus = health.edge.healthy ? chalk.green('✓ Healthy') : chalk.red('✗ Unhealthy');
  const nodeStatus = health.node.healthy ? chalk.green('✓ Healthy') : chalk.red('✗ Unhealthy');

  table.push(
    ['Edge Runtime', edgeStatus, `${health.edge.latency}ms`],
    ['Node.js Runtime', nodeStatus, `${health.node.latency}ms`]
  );

  console.log(table.toString());
  console.log();
  console.log(chalk.dim(`Last checked: ${new Date(health.timestamp).toLocaleString()}`));
}

export async function routingStatsCommand(options: { start?: string; end?: string }): Promise<void> {
  requireAuth();

  const spinner = ora('Fetching routing statistics...').start();
  const result = await api.getRoutingStats(options.start, options.end);

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch routing stats'));
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

  console.log(chalk.bold('Routing Statistics:'));
  console.log(`  Period: ${new Date(stats.period.start).toLocaleDateString()} - ${new Date(stats.period.end).toLocaleDateString()}`);
  console.log();

  // Request distribution
  console.log(chalk.bold('Request Distribution:'));
  const edgePercent = ((stats.requests.edge / stats.requests.total) * 100).toFixed(1);
  const nodePercent = ((stats.requests.node / stats.requests.total) * 100).toFixed(1);

  const requestTable = new Table({
    head: ['Endpoint', 'Requests', 'Percentage'],
    style: { head: ['cyan'] },
  });

  requestTable.push(
    ['Edge', stats.requests.edge.toLocaleString(), `${edgePercent}%`],
    ['Node.js', stats.requests.node.toLocaleString(), `${nodePercent}%`],
    [chalk.bold('Total'), chalk.bold(stats.requests.total.toLocaleString()), chalk.bold('100%')]
  );

  console.log(requestTable.toString());
  console.log();

  // Latency statistics
  console.log(chalk.bold('Latency (milliseconds):'));

  const latencyTable = new Table({
    head: ['Endpoint', 'p50', 'p95', 'p99'],
    style: { head: ['cyan'] },
  });

  latencyTable.push(
    ['Edge', stats.latency.edge.p50, stats.latency.edge.p95, stats.latency.edge.p99],
    ['Node.js', stats.latency.node.p50, stats.latency.node.p95, stats.latency.node.p99]
  );

  console.log(latencyTable.toString());
}
