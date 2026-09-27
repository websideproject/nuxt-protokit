# AGENTS.md

## What Is This?

This is the **nuxt-protokit** monorepo — a schema-driven, offline-first tool builder for Nuxt 4.

- **Package**: `packages/nuxt-protokit` — the publishable `@websideproject/nuxt-protokit` module
- **Playground**: `apps/playground` — development environment with live examples
- **Docs**: `apps/docs` — Docus-powered documentation site
- **CI/CD**: GitHub workflows for build, lint, typecheck, test, release, and PR previews

## Monorepo Structure

```
├── apps/
│   ├── playground/          # Dev environment with example pages
│   │   ├── pages/           # Example pages (break-even, runway, competitors, etc.)
│   │   └── nuxt.config.ts   # Uses @websideproject/nuxt-protokit
│   └── docs/                # Docus documentation site
│       ├── content/         # Protokit markdown documentation
│       └── public/          # Static assets
├── packages/
│   └── nuxt-protokit/       # The publishable Nuxt module
│       ├── src/
│       │   ├── module.ts    # Module definition — auto-imports components, composables, utils
│       │   └── runtime/     # Components, composables, types, utils
│       │       ├── components/  # Proto* components + field/ + viz/
│       │       ├── composables/ # usePrototype, useProtoDoc, useProtoCollection, etc.
│       │       ├── types/       # PrototypeSchema, CollectionSchema, ComputeContext, etc.
│       │       └── utils/       # definePrototype, defineCollection, formatters
│       └── test/            # Module tests
├── tmp/                     # Original source files (safe to delete after migration)
├── .github/
│   ├── workflows/           # CI, release, PR preview workflows
│   └── snippets/            # Automd README snippets
├── turbo.json               # Turborepo configuration
└── package.json             # Root workspace configuration
```

## Commands

```bash
# Install dependencies
bun install

# Prepare module for development (generates types)
bun run dev:prepare

# Start playground (for module development)
bun run dev

# Start documentation site
bun run docs

# Build module
bun run build:module

# Build documentation
bun run build:docs

# Run all tests
bun run test

# Lint all packages
bun run lint
bun run lint:fix

# Type check all packages
bun run typecheck

# Update README with automd snippets
bun run automd
```

## Development Workflow

1. **Develop the module** in `packages/nuxt-protokit/src/`
2. **Test features** in `apps/playground/pages/`
3. **Write tests** in `packages/nuxt-protokit/test/`
4. **Document** in `apps/docs/content/`
5. **Update README** snippets in `.github/snippets/`

## Module Architecture

### Auto-imported API

After adding the module to `nuxt.config.ts`, these are globally available:

The list is `PUBLIC_IMPORTS` in `src/module.ts` (guarded by `test/unit/public-imports.test.ts`): only `use*`, `define*`
and protokit-named functions become globals. Other utils are imported explicitly, e.g.
`import { formatMoney } from '#protokit/utils/formatters'`.

**Utils** (from `runtime/utils/`)
- `definePrototype`, `defineCollection`, `defineHeadlessSchema`, `defineProtokitExtension`

**Composables** (from `runtime/composables/`)
- `usePrototype` — high-level facade (fields, derived, collections, reset, isReady)
- `useProtoDoc` — Y.js document lifecycle (IndexedDB, BroadcastChannel, server sync)
- `useProtoMap`, `useProtoList`, `useProtoCollection`, `useProtoDerived`
- `useProtoOutputs`, `useProtoDraft`, `useProtoCorruption`, `useProtoRegistry`, `useProtoText`, `useProtoCalendar`
- `clearProtoNamespace`, `clearProtoKeys`, `configureProtoPermissions`

**Components** (globally registered from `runtime/components/`)
- `ProtoTool` — full tool renderer
- `ProtoForm`, `ProtoCrudList`, `ProtoCrudModal`, `ProtoStatGrid`
- `ProtoViz`, `ProtoActionBar`, `ProtoDebugPanel`, `ProtoCorruptionModal`
- Field components: `ProtoFieldText`, `ProtoFieldNumber`, `ProtoFieldRange`, etc.
- Viz components: `VizProgressBar`, `VizBarChart`, `VizBenchmarkBar`, etc.

### Module Options

```typescript
// nuxt.config.ts
protokit: {
  serverSync: true,                    // enabled (default)
  serverSync: false,                   // local-only — no HTTP calls
  serverSync: { baseUrl: '/api/yjs' }, // custom server URL
}
```

## Publishing

```bash
# From packages/nuxt-protokit
bun run release
```

## Code Guidelines

### Nuxt UI (in playground/docs)

Use Nuxt UI components and semantic colors:

```vue
<UButton>Click</UButton>
<div class="bg-muted text-highlighted border-default">…</div>
```

### ProtoTool must be wrapped in ClientOnly

```vue
<ClientOnly>
  <ProtoTool :schema="schema" />
  <template #fallback>
    <div class="animate-pulse space-y-4">
      <div class="h-10 bg-muted rounded" />
    </div>
  </template>
</ClientOnly>
```

### Use `disable-sync` for demo/public tools

```vue
<!-- Prevents accumulating server snapshots per visitor -->
<ProtoTool :schema="schema" disable-sync />
```
