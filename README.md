<div align="center">
- <img src="https://raw.githubusercontent.com/entrolytics/.github/main/media/entrov2.png" alt="Entrolytics" width="64" height="64">

[![npm](https://img.shields.io/npm/v/@entrolytics/cli.svg?logo=npm)](https://www.npmjs.com/package/@entrolytics/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-24.22.2+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

---

## Overview

**@entrolytics/cli** is the official command-line interface for Entrolytics - first-party growth analytics for the edge. Set up projects, verify tracking, and view analytics directly from your terminal.

**Why use this CLI?**

- One-command project setup with `entro-ng init`
- Auto-detects Next.js, React, Vue, Svelte, and Astro
- Verify tracking is working without leaving terminal
- View real-time analytics and manage short links

## Key Features

<table>
<tr>
<td width="50%">

### Setup & Management

- `entro-ng init` - One-command setup
- Auto framework detection
- Safe .env management
- OAuth authentication

</td>
<td width="50%">

### Analytics & Tools

- Real-time visitor count
- Top pages, referrers, countries
- Link shortener management
- Framework-specific snippets

</td>
</tr>
</table>

## Quick Start

<table>
<tr>
<td align="center" width="25%">
<img src="https://api.iconify.design/lucide:download.svg?color=%236366f1" width="48"><br>
<strong>1. Install</strong><br>
<code>npm i -g @entrolytics/cli</code>
</td>
<td align="center" width="25%">
<img src="https://api.iconify.design/lucide:terminal.svg?color=%236366f1" width="48"><br>
<strong>2. Initialize</strong><br>
<code>entro-ng init</code>
</td>
<td align="center" width="25%">
<img src="https://api.iconify.design/lucide:check-circle.svg?color=%236366f1" width="48"><br>
<strong>3. Verify</strong><br>
<code>entro-ng verify</code>
</td>
<td align="center" width="25%">
<img src="https://api.iconify.design/lucide:bar-chart-3.svg?color=%236366f1" width="48"><br>
<strong>4. View Stats</strong><br>
<code>entro-ng stats</code>
</td>
</tr>
</table>

## Installation

```bash
npm install -g @entrolytics/cli

# or

pnpm add -g @entrolytics/cli
```

```bash

# Initialize Entrolytics in your project (recommended)

cd your-project
entro-ng init

# Verify tracking is working

entro-ng verify

# View analytics

entro-ng stats <website-id>
```

## Features

- 🚀 **One-command setup** - `entro-ng init` configures everything automatically
- 🔍 **Auto framework detection** - Detects Next.js, React, Vue, Svelte, Astro
- ⚙️ **Safe environment management** - Preserves existing .env variables and comments
- ✅ **Verification tools** - Test tracking without leaving terminal
- 🔄 **Configuration updates** - Easy credential refresh with `entro-ng update`
- 🔐 **OAuth authentication** - Secure token storage
- 📊 **Real-time analytics** - View stats directly in terminal
- 🔗 **Link management** - Create and track short links
- 📝 **Code snippets** - Generate framework-specific integration code

## Commands

### Setup & Initialization

```bash

# Initialize Entrolytics in your project

entro-ng init                          # Auto-detect everything

entro-ng init --framework nextjs       # Specify framework

entro-ng init --domain example.com     # Set domain

entro-ng init --website-id abc-123     # Use existing website

entro-ng init --skip-install           # Don't install package

# Verify tracking is working

entro-ng verify                        # Check current project

entro-ng verify --website-id abc-123   # Check specific website

# Update configuration

entro-ng update                        # Refresh current config

entro-ng update --website-id new-id    # Switch website

entro-ng update --host https://custom  # Change API host

```

### Authentication

```bash
entro-ng login                # Authenticate with Entrolytics

entro-ng logout               # Clear local credentials

entro-ng whoami               # Display current user

entro-ng switch <org>         # Switch active organization

```

### Website Management

```bash
entro-ng sites list                  # List all websites

entro-ng sites add <domain>          # Add new website

entro-ng sites remove <website-id>   # Remove website

entro-ng sites verify <website-id>   # Verify tracking installation

entro-ng sites info <website-id>     # Show website details

```

### Analytics

```bash
entro-ng stats [website-id]                 # Today's overview

entro-ng stats --period 7d                  # Last 7 days

entro-ng stats --period 30d                 # Last 30 days

entro-ng realtime [website-id]              # Live visitor count

entro-ng top pages [website-id]             # Top pages by views

entro-ng top referrers [website-id]         # Top referral sources

entro-ng top countries [website-id]         # Geographic breakdown

```

### Link Shortener

```bash
entro-ng links list                    # List all short links

entro-ng links create <url>            # Create short link

entro-ng links create <url> --slug x   # Create with custom slug

entro-ng links stats <link-id>         # Link click analytics

entro-ng links delete <link-id>        # Delete link

```

### Integration Helpers

```bash
entro-ng snippet --framework next      # Get Next.js snippet

entro-ng snippet --framework react     # Get React snippet

entro-ng snippet --framework astro     # Get Astro snippet

entro-ng snippet --framework vue       # Get Vue snippet

entro-ng snippet --framework html      # Get plain HTML snippet

entro-ng test-event --site <id>        # Send test event

```

## Workflows

### New Project Setup

```bash

# Start a new Next.js project

npx create-next-app@latest my-app
cd my-app

# Set up Entrolytics (one command does it all!)

npx @entrolytics/cli init

# Start your dev server

npm run dev

# Verify tracking is working

npx @entrolytics/cli verify
```

The `init` command will:

1. Authenticate you (opens browser)
2. Detect your framework automatically
3. Create or find your website
4. Add credentials to `.env.local`
5. Optionally install the appropriate package
6. Show you the integration code

### Existing Project

```bash

# Navigate to your project

cd existing-project

# Initialize Entrolytics

entro-ng init

# If you already have a website ID

entro-ng init --website-id abc-123-def --skip-install

# Verify it's working

entro-ng verify
```

### Team Collaboration

```bash

# Team member clones repo

git clone https://github.com/company/project.git
cd project

# Credentials are already in .env.local, just login

entro-ng login

# Verify their setup works

entro-ng verify

# View shared analytics

entro-ng stats
```

### Configuration

```bash
entro-ng config list                   # List all config

entro-ng config get <key>              # Get config value

entro-ng config set <key> <value>      # Set config option

```

**Available config keys:**

- `apiHost` - Entrolytics API URL (default: <https://api.entrolytics.dev>)
- `defaultSiteId` - Default website ID for commands
- `outputFormat` - Output format: `table` or `json`

## Programmatic Usage

You can also use the CLI as a library:

```typescript
import { api, isAuthenticated } from '@entrolytics/cli';

if (isAuthenticated()) {
  const websites = await api.getWebsites();
  console.log(websites.data);
}
```

## Development

```bash

# Install dependencies

pnpm install

# Watch mode

pnpm dev

# Build

pnpm build

# Run locally

node dist/cli.js --help
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
