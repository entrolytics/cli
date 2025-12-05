import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read .env.local file and parse into object
 */
export function readEnvFile(cwd: string, filename: string = '.env.local'): Record<string, string> {
  const envPath = join(cwd, filename);

  if (!existsSync(envPath)) {
    return {};
  }

  try {
    const content = readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse key=value
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        env[key] = value;
      }
    }

    return env;
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return {};
  }
}

/**
 * Write environment variables to .env.local
 * Preserves existing content and comments
 */
export function writeEnvFile(
  cwd: string,
  vars: Record<string, string>,
  filename: string = '.env.local',
): void {
  const envPath = join(cwd, filename);
  let content = '';

  // Read existing content if file exists
  if (existsSync(envPath)) {
    content = readFileSync(envPath, 'utf-8');
  }

  // Parse existing lines
  const lines = content.split('\n');
  const updatedLines: string[] = [];
  const processedKeys = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();

    // Preserve comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      updatedLines.push(line);
      continue;
    }

    // Check if this line defines a variable we're updating
    const match = trimmed.match(/^([^=]+)=/);
    if (match && match[1]) {
      const key = match[1].trim();
      if (key in vars) {
        // Update the value
        const value = vars[key];
        updatedLines.push(`${key}="${value}"`);
        processedKeys.add(key);
      } else {
        // Keep existing line
        updatedLines.push(line);
      }
    } else {
      updatedLines.push(line);
    }
  }

  // Add new variables that weren't in the file
  const newVars = Object.entries(vars).filter(([key]) => !processedKeys.has(key));

  if (newVars.length > 0) {
    // Add a blank line if file has content
    if (updatedLines.length > 0 && updatedLines[updatedLines.length - 1]?.trim() !== '') {
      updatedLines.push('');
    }

    // Add comment for Entrolytics vars
    updatedLines.push('# Entrolytics Analytics');

    for (const [key, value] of newVars) {
      updatedLines.push(`${key}="${value}"`);
    }
  }

  // Write back to file
  writeFileSync(envPath, updatedLines.join('\n') + '\n', 'utf-8');
}

/**
 * Check if environment variables are set
 */
export function hasEnvVars(cwd: string, keys: string[]): boolean {
  const env = readEnvFile(cwd);
  return keys.every(key => key in env && env[key]);
}
