# @entrolytics/cli

Official CLI for [Entrolytics](https://ng.entrolytics.click) - First-party growth analytics for the edge.

## Installation

```bash
npm install -g @entrolytics/cli
# or
pnpm add -g @entrolytics/cli
```

## Quick Start

```bash
# Initialize Entrolytics in your project (recommended)
cd your-project
entro init

# Verify tracking is working
entro verify

# View analytics
entro stats <website-id>
```

## Features

- 🚀 **One-command setup** - `entro init` configures everything automatically
- 🔍 **Auto framework detection** - Detects Next.js, React, Vue, Svelte, Astro
- ⚙️ **Safe environment management** - Preserves existing .env variables and comments
- ✅ **Verification tools** - Test tracking without leaving terminal
- 🔄 **Configuration updates** - Easy credential refresh with `entro update`
- 🔐 **OAuth authentication** - Secure token storage
- 📊 **Real-time analytics** - View stats directly in terminal
- 🔗 **Link management** - Create and track short links
- 📝 **Code snippets** - Generate framework-specific integration code

## Commands

### Setup & Initialization

```bash
# Initialize Entrolytics in your project
entro init                          # Auto-detect everything
entro init --framework nextjs       # Specify framework
entro init --domain example.com     # Set domain
entro init --website-id abc-123     # Use existing website
entro init --skip-install           # Don't install package

# Verify tracking is working
entro verify                        # Check current project
entro verify --website-id abc-123   # Check specific website

# Update configuration
entro update                        # Refresh current config
entro update --website-id new-id    # Switch website
entro update --host https://custom  # Change API host
```

### Authentication

```bash
entro login                # Authenticate with Entrolytics
entro logout               # Clear local credentials
entro whoami               # Display current user
entro switch <org>         # Switch active organization
```

### Website Management

```bash
entro sites list                  # List all websites
entro sites add <domain>          # Add new website
entro sites remove <website-id>   # Remove website
entro sites verify <website-id>   # Verify tracking installation
entro sites info <website-id>     # Show website details
```

### Analytics

```bash
entro stats [website-id]                 # Today's overview
entro stats --period 7d                  # Last 7 days
entro stats --period 30d                 # Last 30 days
entro realtime [website-id]              # Live visitor count
entro top pages [website-id]             # Top pages by views
entro top referrers [website-id]         # Top referral sources
entro top countries [website-id]         # Geographic breakdown
```

### Link Shortener

```bash
entro links list                    # List all short links
entro links create <url>            # Create short link
entro links create <url> --slug x   # Create with custom slug
entro links stats <link-id>         # Link click analytics
entro links delete <link-id>        # Delete link
```

### Integration Helpers

```bash
entro snippet --framework next      # Get Next.js snippet
entro snippet --framework react     # Get React snippet
entro snippet --framework astro     # Get Astro snippet
entro snippet --framework vue       # Get Vue snippet
entro snippet --framework html      # Get plain HTML snippet
entro test-event --site <id>        # Send test event
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
entro init

# If you already have a website ID
entro init --website-id abc-123-def --skip-install

# Verify it's working
entro verify
```

### Team Collaboration

```bash
# Team member clones repo
git clone https://github.com/company/project.git
cd project

# Credentials are already in .env.local, just login
entro login

# Verify their setup works
entro verify

# View shared analytics
entro stats
```

### Configuration

```bash
entro config list                   # List all config
entro config get <key>              # Get config value
entro config set <key> <value>      # Set config option
```

**Available config keys:**

- `apiHost` - Entrolytics API URL (default: https://ng.entrolytics.click)
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
