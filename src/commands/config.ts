import chalk from 'chalk';
import Table from 'cli-table3';
import { getConfig, setConfig } from '../lib/config.js';
import type { Config } from '../lib/types.js';

const validKeys: (keyof Config)[] = ['apiHost', 'defaultSiteId', 'outputFormat'];

export async function configCommand(action: string, key?: string, value?: string): Promise<void> {
  switch (action) {
    case 'list': {
      const config = getConfig();

      const table = new Table({
        head: ['Key', 'Value'],
        style: { head: ['cyan'] },
      });

      table.push(
        ['apiHost', config.apiHost],
        ['defaultSiteId', config.defaultSiteId || chalk.dim('(not set)')],
        ['outputFormat', config.outputFormat],
      );

      console.log(chalk.bold('Configuration:'));
      console.log(table.toString());
      break;
    }

    case 'get': {
      if (!key) {
        console.log(chalk.red('Key is required'));
        return;
      }

      if (!validKeys.includes(key as keyof Config)) {
        console.log(chalk.red(`Invalid key: ${key}`));
        console.log(chalk.dim(`Valid keys: ${validKeys.join(', ')}`));
        return;
      }

      const config = getConfig();
      const configValue = config[key as keyof Config];

      if (configValue === undefined) {
        console.log(chalk.dim('(not set)'));
      } else {
        console.log(configValue);
      }
      break;
    }

    case 'set': {
      if (!key || value === undefined) {
        console.log(chalk.red('Key and value are required'));
        return;
      }

      if (!validKeys.includes(key as keyof Config)) {
        console.log(chalk.red(`Invalid key: ${key}`));
        console.log(chalk.dim(`Valid keys: ${validKeys.join(', ')}`));
        return;
      }

      // Validate specific keys
      if (key === 'outputFormat' && !['table', 'json'].includes(value)) {
        console.log(chalk.red('outputFormat must be "table" or "json"'));
        return;
      }

      if (key === 'apiHost' && !value.startsWith('http')) {
        console.log(chalk.red('apiHost must be a valid URL'));
        return;
      }

      setConfig(key as keyof Config, value as Config[keyof Config]);
      console.log(chalk.green(`Set ${key} = ${value}`));
      break;
    }

    default:
      console.log(chalk.red(`Unknown action: ${action}`));
      console.log(chalk.dim('Use: config list, config get <key>, config set <key> <value>'));
  }
}
