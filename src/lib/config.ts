import Conf from 'conf';
import type { Config } from './types.js';

const DEFAULT_API_HOST = 'https://entrolytics.click';

const configStore = new Conf<Config>({
  projectName: 'entro-ng-cli',
  defaults: {
    apiHost: DEFAULT_API_HOST,
    outputFormat: 'table',
  },
});

export function getConfig(): Config {
  return {
    apiHost: configStore.get('apiHost'),
    defaultSiteId: configStore.get('defaultSiteId'),
    outputFormat: configStore.get('outputFormat'),
  };
}

export function setConfig<K extends keyof Config>(key: K, value: Config[K]): void {
  configStore.set(key, value);
}

export function clearConfig(): void {
  configStore.clear();
}

export function getApiHost(): string {
  return configStore.get('apiHost') || DEFAULT_API_HOST;
}

export function getDefaultSiteId(): string | undefined {
  return configStore.get('defaultSiteId');
}
