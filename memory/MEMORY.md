# nuxt-protokit Monorepo Memory

## Project Identity
- **Monorepo name**: `nuxt-module-starter` → renamed to `nuxt-protokit-monorepo`
- **Package**: `@websideproject/nuxt-protokit` at `packages/nuxt-protokit/`
- **GitHub repo**: `websideproject/nuxt-protokit`
- **Module config key**: `protokit`

## Structure
```
packages/nuxt-protokit/     ← publishable module (@websideproject/nuxt-protokit)
  src/module.ts             ← main module definition
  src/runtime/
    components/             ← Proto* + fields/ + viz/ (globally registered)
    composables/            ← usePrototype, useProtoDoc, etc. (auto-imported)
    types/                  ← PrototypeSchema, CollectionSchema, ComputeContext, etc.
    utils/                  ← definePrototype, defineCollection, formatters (auto-imported)
  test/                     ← vitest tests

apps/playground/            ← name: nuxt-protokit-playground
  pages/
    index.vue               ← hub with links to examples
    break-even.vue          ← break-even calculator (fields + derived + progress viz)
    resource-estimator.vue  ← from docs quick-start (range + bar-chart + badge)
    runway.vue              ← multi-section form (sections API)
    competitors.vue         ← CRUD collection with search + table
    corruption-recovery.vue ← IndexedDB corruption recovery demo

apps/docs/                  ← name: nuxt-protokit-docs (docus-powered)
  content/
    1.getting-started/      ← Introduction, Concepts, Quick Start
    2.schemas/              ← Fields, Collections, Derived, Connections, Visualizations
    3.composables/          ← usePrototype, useProtoDoc, useProtoCollection
    4.components/           ← ProtoTool, ProtoCrudModal
    5.offline-first/        ← Offline architecture, Corruption recovery
    6.advanced/             ← Building a toolkit, Custom schema patterns
```

## Key Patterns
- `ProtoTool` must always be wrapped in `<ClientOnly>` (uses IndexedDB)
- Use `disable-sync` prop for demo/playground tools (no server snapshots per visitor)
- Alias `#protokit` → `packages/nuxt-protokit/src/runtime`
- Module options: `serverSync: true|false|{ baseUrl }` — default is `true`

## tmp/ directory
- `tmp/protokit/` — original source files (already migrated, safe to delete)
- `tmp/prototype-demo.vue` — reference demo with all field types
- `tmp/prototype-demo-live.vue` — corruption recovery test page

## Workspace scripts (root package.json)
- `bun run dev` → playground
- `bun run docs` → docs site
- `bun run build:module` → `@websideproject/nuxt-protokit`
- `bun run dev:prepare` → generate type stubs

## Notes
- Uses Bun as package manager
- Turborepo for task orchestration
- Docus for documentation (uses `--extends docus`)
- Module built with `@nuxt/module-builder`
