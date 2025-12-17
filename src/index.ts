// Re-export public API for programmatic usage

export { api } from './lib/api.js';
export {
  clearAuth,
  getAuthToken,
  isAuthenticated,
  isAuthenticatedWithValidation,
  validateTokenWithServer,
} from './lib/auth.js';
export { clearConfig, getConfig, setConfig } from './lib/config.js';
export type { AuthCredentials, Config, Link, Stats, Website } from './lib/types.js';
export { description, version } from './version.js';
