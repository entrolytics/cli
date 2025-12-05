import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { requireAuth } from '../lib/auth.js';
import { getApiHost, getDefaultSiteId } from '../lib/config.js';

interface SnippetOptions {
  framework: string;
}

const snippets: Record<string, (host: string, siteId: string) => string> = {
  html: (host, siteId) =>
    `<script defer src="${host}/script.js" data-website-id="${siteId}"></script>`,

  react: (host, siteId) => `// Install: npm install @entrolytics/react

import { EntrolyticsProvider } from '@entrolytics/react';

function App() {
  return (
    <EntrolyticsProvider
      websiteId="${siteId}"
      host="${host}"
    >
      <YourApp />
    </EntrolyticsProvider>
  );
}`,

  next: (host, siteId) => `// Install: npm install @entrolytics/nextjs

// app/layout.tsx
import { EntrolyticsScript } from '@entrolytics/nextjs';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <EntrolyticsScript
          websiteId="${siteId}"
          host="${host}"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`,

  astro: (host, siteId) => `// Install: npm install @entrolytics/astro

// astro.config.mjs
import { defineConfig } from 'astro/config';
import entrolytics from '@entrolytics/astro';

export default defineConfig({
  integrations: [
    entrolytics({
      websiteId: '${siteId}',
      host: '${host}'
    })
  ]
});`,

  vue: (host, siteId) => `// Install: npm install @entrolytics/vue

// main.ts
import { createApp } from 'vue';
import { createEntrolytics } from '@entrolytics/vue';

const app = createApp(App);

app.use(createEntrolytics({
  websiteId: '${siteId}',
  host: '${host}'
}));

app.mount('#app');`,

  svelte: (host, siteId) => `// Install: npm install @entrolytics/svelte

// +layout.svelte
<script>
  import { Entrolytics } from '@entrolytics/svelte';
</script>

<Entrolytics
  websiteId="${siteId}"
  host="${host}"
/>
<slot />`,
};

export async function snippetCommand(options: SnippetOptions): Promise<void> {
  const siteId = getDefaultSiteId();
  if (!siteId) {
    console.log(chalk.yellow('No default website configured.'));
    console.log(chalk.dim('Set a default website with:'));
    console.log(chalk.dim('  entro-ng config set defaultSiteId <website-id>'));
    console.log();
    console.log(chalk.dim('Or get a generic snippet by running:'));
    console.log(chalk.dim(`  ${chalk.cyan('entro-ng sites list')} to see your website IDs`));
    return;
  }

  const framework = options.framework.toLowerCase();
  const getSnippet = snippets[framework];

  if (!getSnippet) {
    console.log(chalk.red(`Unknown framework: ${framework}`));
    console.log(chalk.dim('Available: html, react, next, astro, vue, svelte'));
    return;
  }

  const host = getApiHost();
  const snippet = getSnippet(host, siteId);

  console.log(
    chalk.bold(`${framework.charAt(0).toUpperCase() + framework.slice(1)} Tracking Snippet:`),
  );
  console.log();
  console.log(chalk.cyan(snippet));
  console.log();
  console.log(chalk.dim('Copy and paste this into your project.'));
}

interface TestEventOptions {
  site: string;
}

export async function testEventCommand(options: TestEventOptions): Promise<void> {
  requireAuth();

  const spinner = ora('Sending test event...').start();
  const result = await api.sendTestEvent(options.site);

  if (result.error) {
    spinner.fail(chalk.red('Failed to send test event'));
    console.error(chalk.dim(result.error));
    return;
  }

  spinner.succeed(chalk.green('Test event sent!'));
  console.log(chalk.dim('Check your Entrolytics dashboard to verify the event was received.'));
  console.log(chalk.dim(`Event name: ${chalk.cyan('cli_test_event')}`));
}
