import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import * as api from '../lib/api.js';
import { requireAuth } from '../lib/auth.js';
import { getConfig, getDefaultSiteId } from '../lib/config.js';

interface FormsOptions {
  period: string;
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

/**
 * Show form analytics overview
 */
export async function formsCommand(
  websiteId: string | undefined,
  options: FormsOptions,
): Promise<void> {
  requireAuth();

  const siteId = websiteId || getDefaultSiteId();
  if (!siteId) {
    console.log(chalk.yellow('No website specified.'));
    console.log(chalk.dim('Provide a website ID or set a default with:'));
    console.log(chalk.dim('  entro-ng config set defaultSiteId <website-id>'));
    return;
  }

  const spinner = ora('Fetching form analytics...').start();
  const { startDate, endDate } = getPeriodRange(options.period);
  const result = await api.getFormConversions(siteId, startDate, endDate);

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch form data'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const forms = result.data!;
  const config = getConfig();

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(forms, null, 2));
    return;
  }

  console.log(chalk.bold(`Form Analytics (${options.period})`));
  console.log();

  if (forms.length === 0) {
    console.log(chalk.dim('No form data available for this period.'));
    console.log(chalk.dim('Make sure form tracking is enabled on your website.'));
    return;
  }

  const table = new Table({
    head: ['Form', 'Starts', 'Submits', 'Abandons', 'Conv. Rate'],
    style: { head: ['cyan'] },
    colWidths: [30, 10, 10, 10, 12],
  });

  for (const form of forms) {
    const convRateColor =
      form.conversionRate >= 50
        ? chalk.green
        : form.conversionRate >= 20
          ? chalk.yellow
          : chalk.red;

    table.push([
      (form.formName || form.formId).substring(0, 28),
      form.starts.toLocaleString(),
      form.submits.toLocaleString(),
      form.abandons.toLocaleString(),
      convRateColor(`${form.conversionRate.toFixed(1)}%`),
    ]);
  }

  console.log(table.toString());

  console.log();
  console.log(chalk.dim('Tip: Use --format json for detailed field-level metrics'));
}

/**
 * Show form field metrics
 */
export async function formFieldsCommand(
  formId: string,
  websiteId: string | undefined,
  options: FormsOptions,
): Promise<void> {
  requireAuth();

  const siteId = websiteId || getDefaultSiteId();
  if (!siteId) {
    console.log(chalk.yellow('No website specified.'));
    return;
  }

  const spinner = ora('Fetching field metrics...').start();
  const { startDate, endDate } = getPeriodRange(options.period);
  const result = await api.getFormFieldMetrics(siteId, formId, startDate, endDate);

  if (result.error) {
    spinner.fail(chalk.red('Failed to fetch field metrics'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.stop();

  const fields = result.data!;
  const config = getConfig();

  if (config.outputFormat === 'json') {
    console.log(JSON.stringify(fields, null, 2));
    return;
  }

  console.log(chalk.bold(`Field Metrics: ${formId}`));
  console.log();

  if (fields.length === 0) {
    console.log(chalk.dim('No field data available.'));
    return;
  }

  const table = new Table({
    head: ['Field', 'Type', 'Focus', 'Blur', 'Errors', 'Avg Time'],
    style: { head: ['cyan'] },
  });

  for (const field of fields) {
    table.push([
      field.fieldName,
      field.fieldType,
      field.focusCount.toLocaleString(),
      field.blurCount.toLocaleString(),
      field.errorCount > 0 ? chalk.red(field.errorCount.toString()) : '0',
      `${(field.avgTimeOnField / 1000).toFixed(1)}s`,
    ]);
  }

  console.log(table.toString());
}
