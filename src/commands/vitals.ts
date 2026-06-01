import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import * as api from '../lib/api.js';
import { requireAuth } from '../lib/auth.js';
import { getConfig, getDefaultSiteId } from '../lib/config.js';

interface VitalsOptions {
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
    default:
      return { startDate: new Date(now.getTime() - 24 * day), endDate: now };
  }
}

function getRatingColor(rating: string): typeof chalk {
  switch (rating) {
    case 'good':
      return chalk.green;
    case 'needs-improvement':
      return chalk.yellow;
    case 'poor':
      return chalk.red;
    default:
      return chalk.dim;
  }
}

function getRating(metric: string, value: number): string {
  const thresholds: Record<string, { good: number; poor: number }> = {
    LCP: { good: 2500, poor: 4000 },
    INP: { good: 200, poor: 500 },
    CLS: { good: 0.1, poor: 0.25 },
    TTFB: { good: 800, poor: 1800 },
    FCP: { good: 1800, poor: 3000 },
  };

  const t = thresholds[metric];
  if (!t) return 'unknown';

  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

function formatMetricValue(metric: string, value: number): string {
  if (metric === 'CLS') {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
}

/**
 * Show Web Vitals overview for a website
 */
export async function vitalsCommand(
  websiteId: string | undefined,
  options: VitalsOptions,
): Promise<void> {
  requireAuth();

  const siteId = websiteId || getDefaultSiteId();
  if (!siteId) {
    console.log(chalk.yellow('No website specified.'));
    console.log(chalk.dim('Provide a website ID or set a default with:'));
    console.log(chalk.dim('  entro-ng config set defaultSiteId <website-id>'));
    return;
  }

  const spinner = ora('Fetching Web Vitals...').start();
  const { startDate, endDate } = getPeriodRange(options.period);
  const result = await api.getVitalsOverview(siteId, startDate, endDate);

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch vitals'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const vitals = result.data!;
  const config = getConfig();

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(vitals, null, 2));
    return;
  }

  console.log(chalk.bold(`Web Vitals Overview (${options.period})`));
  console.log();

  if (vitals.length === 0) {
    console.log(chalk.dim('No Web Vitals data available for this period.'));
    return;
  }

  const table = new Table({
    head: ['Metric', 'P75 Value', 'Avg Value', 'Samples', 'Good %', 'Rating'],
    style: { head: ['cyan'] },
  });

  for (const vital of vitals) {
    const rating = getRating(vital.metricName, vital.p75Value);
    const ratingColor = getRatingColor(rating);

    table.push([
      vital.metricName,
      formatMetricValue(vital.metricName, vital.p75Value),
      formatMetricValue(vital.metricName, vital.avgValue),
      vital.count.toLocaleString(),
      `${vital.goodPercentage.toFixed(1)}%`,
      ratingColor(rating),
    ]);
  }

  console.log(table.toString());

  console.log();
  console.log(chalk.dim('Thresholds: LCP <2.5s, INP <200ms, CLS <0.1, TTFB <800ms, FCP <1.8s'));
}

/**
 * Show Web Vitals breakdown by page
 */
export async function vitalsPageCommand(
  websiteId: string | undefined,
  options: VitalsOptions,
): Promise<void> {
  requireAuth();

  const siteId = websiteId || getDefaultSiteId();
  if (!siteId) {
    console.log(chalk.yellow('No website specified.'));
    return;
  }

  const limit = parseInt(options.limit, 10);
  const spinner = ora('Fetching page breakdown...').start();
  const { startDate, endDate } = getPeriodRange(options.period);
  const result = await api.getVitalsPageBreakdown(siteId, startDate, endDate, limit);

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch page breakdown'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const pages = result.data!;
  const config = getConfig();

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(pages, null, 2));
    return;
  }

  console.log(chalk.bold('Web Vitals by Page'));
  console.log();

  if (pages.length === 0) {
    console.log(chalk.dim('No page data available for this period.'));
    return;
  }

  const table = new Table({
    head: ['Page', 'LCP', 'INP', 'CLS', 'Count'],
    style: { head: ['cyan'] },
    colWidths: [40, 12, 12, 12, 10],
  });

  for (const page of pages) {
    const lcpStr = page.avgLcp ? `${Math.round(page.avgLcp)}ms` : '-';
    const inpStr = page.avgInp ? `${Math.round(page.avgInp)}ms` : '-';
    const clsStr = page.avgCls ? page.avgCls.toFixed(3) : '-';

    table.push([
      page.path.length > 38 ? page.path.substring(0, 35) + '...' : page.path,
      lcpStr,
      inpStr,
      clsStr,
      page.count.toString(),
    ]);
  }

  console.log(table.toString());
}
