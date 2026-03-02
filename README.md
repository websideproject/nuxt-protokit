# nuxt-protokit

<!-- automd:badges color="black" license name="@websideproject/nuxt-protokit" -->

[![npm version](https://img.shields.io/npm/v/@websideproject/nuxt-protokit?color=black)](https://npmjs.com/package/@websideproject/nuxt-protokit)
[![npm downloads](https://img.shields.io/npm/dm/@websideproject/nuxt-protokit?color=black)](https://npm.chart.dev/@websideproject/nuxt-protokit)
[![license](https://img.shields.io/github/license/websideproject/nuxt-protokit?color=black)](https://github.com/websideproject/nuxt-protokit/blob/main/LICENSE)

<!-- /automd -->

Schema-driven rapid prototyping for Nuxt 4. Define a TypeScript schema and get a fully working interactive prototype — forms, CRUD, computed values, visualizations, and automatic Y.js persistence.

## ✨ Features

<!-- automd:file src=".github/snippets/features.md" -->

- 📋 **Schema-driven** — define fields, derived values, collections, and visualizations in one TypeScript object
- 📴 **Offline-first** — Y.js + IndexedDB means every write is local-first; data is safe without a server
- 🧮 **12 field types** — number, text, textarea, select, segmented, toggle, range, rating, color, date, tags, linked-responses
- 📊 **5 visualization types** — progress bar, benchmark bar, bar chart, comparison table, feature matrix, timeline
- 🔗 **Connected prototypes** — `produces`/`consumes` wire prototypes together via a reactive CRDT data graph
- 🛡️ **Corruption recovery** — auto-detect IndexedDB corruption; restore from server snapshots when a sync backend is present
- 🔄 **Multi-tab sync** — BroadcastChannel propagates edits across open tabs without a server round-trip
- 🧩 **Extensible** — register custom field types and viz types via `defineProtokitExtension` without modifying the module

<!-- /automd -->

## 🚀 Installation

<!-- automd:file src=".github/snippets/installation.md" -->

Install the module and its peer dependencies:

```bash
# npm
npm install @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui

# pnpm
pnpm add @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui

# bun
bun add @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui
```

Then add it to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@websideproject/nuxt-protokit'],
  protokit: {
    serverSync: false, // set true to enable server persistence — need help? websideproject.com
  },
})
```

<!-- /automd -->

## 🔄 Server sync

`serverSync: true` requires a compatible backend that implements the Y.js sync API (`POST /api/yjs/sync`, `GET /api/yjs/pull`, `GET /api/yjs/snapshots/:key`). You can use the separate **`yjs-sync`** companion module or build the endpoints yourself. Without a backend, keep `serverSync: false` — prototypes work fully offline via IndexedDB with no HTTP calls.

## 📖 Documentation

📖 **[Full Documentation →](https://github.com/websideproject/nuxt-protokit)**

## 🤝 Contributing

<!-- automd:file src=".github/snippets/contributing.md" -->

Contributions are welcome! Feel free to open an issue or submit a pull request.

```bash
# Install dependencies
bun install

# Generate type stubs
bun run dev:prepare

# Start the playground
bun run dev

# Run tests
bun run test
```

<!-- /automd -->

## 🧪 Test Coverage

<!-- automd:file src=".github/snippets/coverage.md" -->

| File | Stmts | Branch | Funcs | Lines |
|------|------:|-------:|------:|------:|
| **composables** | | | | |
| useProtoCollection.ts | 84.84% | 67.85% | 100% | 89.65% |
| useProtoDerived.ts | 88.23% | 75% | 100% | 88.23% |
| useProtoDoc.ts | 2.35% | 0% | 0% | 2.63% |
| useProtoList.ts | 85.24% | 73.68% | 100% | 94.33% |
| useProtoMap.ts | 98.18% | 86.66% | 100% | 98.03% |
| usePrototype.ts | 85.18% | 37.5% | 75% | 85.18% |
| **utils** | | | | |
| deepClone.ts | 100% | 100% | 100% | 100% |
| formatters.ts | 94.73% | 89.36% | 100% | 96.42% |
| runMigrations.ts | 100% | 100% | 100% | 100% |
| **All files** | **38%** | **38.22%** | **37.81%** | **38.98%** |

> Coverage collected from 94 tests (39 unit + 55 browser). Files with 0% (`useProtoDoc`, `useProtoKitConfig`, etc.) require the Nuxt runtime and are tested via integration rather than unit tests.

<!-- /automd -->

## ❓ Questions & Support

<!-- automd:file src=".github/snippets/support.md" -->

- **Issues**: [Open an issue](https://github.com/websideproject/nuxt-protokit/issues) for bugs or feature requests
- **Discussions**: [Join the discussion](https://github.com/websideproject/nuxt-protokit/discussions) for questions and ideas

<!-- /automd -->

## 📄 License

<!-- automd:file src=".github/snippets/license.md" -->

Published under the [MIT](https://github.com/websideproject/nuxt-protokit/blob/main/LICENSE) license.

Made by [websideproject](https://github.com/websideproject) and [community](https://github.com/websideproject/nuxt-protokit/graphs/contributors) 💛

<a href="https://github.com/websideproject/nuxt-protokit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=websideproject/nuxt-protokit" />
</a>

<!-- /automd -->
