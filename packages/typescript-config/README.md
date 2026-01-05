# @boilerplate/typescript-config

Shared TypeScript configurations for the monorepo.

## Usage

In your package's `tsconfig.json`:

```json
{
  "extends": "@boilerplate/typescript-config/react.json",
  "compilerOptions": {
    // Your overrides
  }
}
```

Available configs:

- `base.json` - Base configuration
- `react.json` - React/Frontend configuration
- `node.json` - Node.js/Backend configuration
