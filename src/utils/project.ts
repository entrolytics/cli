import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ProjectInfo {
  name?: string;
  version?: string;
  framework?: 'nextjs' | 'react' | 'vue' | 'svelte' | 'astro' | 'html' | null;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  domain?: string;
  homepage?: string;
  hasPackageJson: boolean;
  projectPath: string;
}

/**
 * Detect project framework and metadata
 */
export function detectProject(cwd: string = process.cwd()): ProjectInfo {
  const info: ProjectInfo = {
    hasPackageJson: false,
    projectPath: cwd,
    packageManager: detectPackageManager(cwd),
  };

  const packageJsonPath = join(cwd, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return info;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    info.hasPackageJson = true;
    info.name = packageJson.name;
    info.version = packageJson.version;
    info.homepage = packageJson.homepage;

    // Extract domain from homepage
    if (info.homepage) {
      try {
        const url = new URL(info.homepage);
        info.domain = url.hostname;
      } catch {
        // Invalid URL, ignore
      }
    }

    // Detect framework from dependencies
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (
      deps.next ||
      existsSync(join(cwd, 'next.config.js')) ||
      existsSync(join(cwd, 'next.config.mjs')) ||
      existsSync(join(cwd, 'next.config.ts'))
    ) {
      info.framework = 'nextjs';
    } else if (
      deps.astro ||
      existsSync(join(cwd, 'astro.config.mjs')) ||
      existsSync(join(cwd, 'astro.config.ts'))
    ) {
      info.framework = 'astro';
    } else if (
      deps.vue ||
      (existsSync(join(cwd, 'vite.config.js')) && existsSync(join(cwd, 'src', 'App.vue')))
    ) {
      info.framework = 'vue';
    } else if (deps.svelte || existsSync(join(cwd, 'svelte.config.js'))) {
      info.framework = 'svelte';
    } else if (deps.react || deps['react-dom']) {
      info.framework = 'react';
    }

    return info;
  } catch (error) {
    console.error('Error reading package.json:', error);
    return info;
  }
}

/**
 * Detect package manager from lock files
 */
export function detectPackageManager(cwd: string): 'npm' | 'pnpm' | 'yarn' | 'bun' {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(cwd, 'bun.lockb'))) return 'bun';
  return 'npm';
}

/**
 * Get package name for framework
 */
export function getPackageName(framework: string | null): string | null {
  const packages: Record<string, string> = {
    nextjs: '@entrolytics/nextjs-sdk',
    react: '@entrolytics/react-sdk',
    vue: '@entrolytics/vue-sdk',
    svelte: '@entrolytics/svelte-sdk',
    astro: '@entrolytics/astro-sdk',
  };

  return framework ? packages[framework] || null : null;
}

/**
 * Get environment variable names for framework
 */
export function getEnvVarNames(framework: string | null): {
  websiteId: string;
  host: string;
  envFile: string;
} {
  // Most frameworks use NEXT_PUBLIC_ prefix or similar
  if (framework === 'nextjs') {
    return {
      websiteId: 'NEXT_PUBLIC_ENTROLYTICS_NG_WEBSITE_ID',
      host: 'NEXT_PUBLIC_ENTROLYTICS_HOST',
      envFile: '.env.local',
    };
  }

  // For other frameworks, use VITE_ prefix (common in Vite-based setups)
  if (framework === 'vue' || framework === 'svelte') {
    return {
      websiteId: 'VITE_ENTROLYTICS_NG_WEBSITE_ID',
      host: 'VITE_ENTROLYTICS_HOST',
      envFile: '.env',
    };
  }

  // Astro uses PUBLIC_
  if (framework === 'astro') {
    return {
      websiteId: 'PUBLIC_ENTROLYTICS_NG_WEBSITE_ID',
      host: 'PUBLIC_ENTROLYTICS_HOST',
      envFile: '.env',
    };
  }

  // React (CRA or other) uses REACT_APP_
  if (framework === 'react') {
    return {
      websiteId: 'REACT_APP_ENTROLYTICS_NG_WEBSITE_ID',
      host: 'REACT_APP_ENTROLYTICS_HOST',
      envFile: '.env.local',
    };
  }

  // Default to standard env vars
  return {
    websiteId: 'ENTROLYTICS_NG_WEBSITE_ID',
    host: 'ENTROLYTICS_HOST',
    envFile: '.env',
  };
}
