# Boilerplate Monorepo

A modern monorepo boilerplate built with:

- 🏗️ **[Turborepo](https://turbo.build/)** - High-performance build system
- 📘 **[TypeScript](https://www.typescriptlang.org/)** - Type safety across the entire stack
- 🎨 **[Biome](https://biomejs.dev/)** - Fast formatter and linter
- ⚛️ **[React](https://react.dev/)** + **[Tanstack Router](https://tanstack.com/router)** - Frontend with type-safe routing
- 🚀 **[NestJS](https://nestjs.com/)** - Scalable backend framework
- 🧪 **[Vitest](https://vitest.dev/)** - Fast unit testing
- 🐕 **[Husky](https://typicode.github.io/husky/)** - Git hooks for code quality

## Structure

```
boilerplate/
├── apps/
│   ├── frontend/          # React app with Tanstack Router
│   └── backend/           # NestJS API
├── packages/
│   └── typescript-config/ # Shared TypeScript configurations
├── turbo.json            # Turborepo configuration
├── biome.json            # Biome configuration
└── package.json          # Root package.json
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Installation

```bash
# Install dependencies
pnpm install

# Setup git hooks
pnpm prepare
```

### Development

```bash
# Start all apps in development mode
pnpm dev

# Start specific app
pnpm --filter @boilerplate/frontend dev
pnpm --filter @boilerplate/backend dev
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:4000`.

### Building

```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter @boilerplate/frontend build
pnpm --filter @boilerplate/backend build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm --filter @boilerplate/frontend test:watch
pnpm --filter @boilerplate/backend test:watch

# Run e2e tests
pnpm --filter @boilerplate/backend test:e2e
```

### Linting & Formatting

```bash
# Check code with Biome
pnpm check

# Format code
pnpm format

# Type check
pnpm type-check
```

### Clean

```bash
# Clean all build artifacts and node_modules
pnpm clean
```

## Apps

### Frontend (`apps/frontend`)

React application with:

- Tanstack Router for type-safe routing
- Vite for fast development and building
- Vitest for testing

### Backend (`apps/backend`)

NestJS application with:

- RESTful API structure
- Health check endpoint
- Vitest for unit and e2e testing

## Packages

### TypeScript Config (`packages/typescript-config`)

Shared TypeScript configurations:

- `base.json` - Base configuration
- `react.json` - React/Frontend configuration
- `node.json` - Node.js/Backend configuration

## Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps
- `pnpm test` - Run tests across all packages
- `pnpm lint` - Lint all code
- `pnpm format` - Format all code
- `pnpm check` - Run Biome checks and fixes
- `pnpm type-check` - Type check all packages
- `pnpm clean` - Remove all build artifacts

## Git Hooks

Pre-commit hook runs:

- Biome checks (linting and formatting)
- Type checking

Pre-push hook runs:

- All tests

## Adding New Packages

### Create a new app

```bash
mkdir -p apps/my-app
cd apps/my-app
pnpm init
```

### Create a new package

```bash
mkdir -p packages/my-package
cd packages/my-package
pnpm init
```

Make sure to add the workspace to `pnpm-workspace.yaml` if needed.

## License

MIT
