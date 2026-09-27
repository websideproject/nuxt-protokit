# nuxt-protokit

<!-- automd:badges color="black" license name="@websideproject/nuxt-protokit" -->

[![npm version](https://img.shields.io/npm/v/@websideproject/nuxt-protokit?color=black)](https://npmjs.com/package/@websideproject/nuxt-protokit)
[![npm downloads](https://img.shields.io/npm/dm/@websideproject/nuxt-protokit?color=black)](https://npm.chart.dev/@websideproject/nuxt-protokit)
[![license](https://img.shields.io/github/license/websideproject/nuxt-protokit?color=black)](https://github.com/websideproject/nuxt-protokit/blob/main/LICENSE)

<!-- /automd -->

Schema-driven prototyping for Nuxt 4. Describe a tool as one TypeScript object — fields, computed values, collections, results and charts — and `<ProtoTool>` renders it, saved to IndexedDB through Y.js as you type.

## ✨ Features

<!-- automd:file src=".github/snippets/features.md" -->

- 📋 **Schema-driven** — fields, derived values, collections, result cards and visualizations in one TypeScript object
- 📴 **Offline-first** — Y.js + IndexedDB: every edit is saved locally; tabs stay in sync over BroadcastChannel
- 🧮 **12 field types** — number, text, textarea, select, segmented, toggle, range, rating, color, date, tags, linked-responses
- 📊 **12 visualization types** — progress, benchmark, bar, line, area, pie, donut and funnel charts, stat cards, comparison table, feature matrix, timeline
- 🗓️ **Calendar, item panels, dashboards** — ready-made components driven by the same schema
- 🧱 **Headless mode** — the persistence layer (`usePrototype`, `useProtoMap`, `useProtoList`, `useProtoText`) without any UI
- 🔐 **Migrations, namespaces, encryption** — versioned schemas, per-tenant isolation, AES-GCM encrypted storage
- 🛡️ **Corruption recovery** — detects a corrupt IndexedDB document; restores from server snapshots when a backend is configured
- 🧩 **Extensible** — custom field and visualization types via `defineProtokitExtension`

<!-- /automd -->

## 🚀 Installation

<!-- automd:file src=".github/snippets/installation.md" -->

Install the module and its peer dependencies:

```bash
# npm
npm install @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui tailwindcss

# pnpm
pnpm add @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui tailwindcss

# bun
bun add @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui tailwindcss
```

Add it to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@websideproject/nuxt-protokit'],
  css: ['~/assets/css/main.css'],
  protokit: {
    serverSync: false, // local only — see "Server backup"
  },
})
```

The components are styled with Tailwind classes, so Tailwind has to scan the module — one line in your stylesheet
(the path is relative to the CSS file):

```css
/* app/assets/css/main.css */
@import "tailwindcss";
@import "@nuxt/ui";

@source "../../../node_modules/@websideproject/nuxt-protokit";
```

<!-- /automd -->

## 🔄 Server backup

With `serverSync` enabled (the default is `true`) the client pushes each document's Y.js state to your backend and asks
it for snapshots, which corruption recovery restores from: `POST /api/yjs/sync`, `POST /api/yjs/snapshots/create`,
`GET /api/yjs/snapshots/:key`, `POST /api/yjs/snapshots/restore`, `GET /api/yjs/pull` (base URL configurable with
`serverSync: { baseUrl }`). Failed requests are ignored, so the local copy keeps working without a backend; set
`serverSync: false` to make no requests at all. Protokit ships the client side only.

## 📖 Documentation

📖 **[Full documentation → websideproject.com/docs/nuxt-protokit](https://websideproject.com/docs/nuxt-protokit/getting-started)**

## 🤖 Claude Code Skills

If you use [Claude Code](https://claude.ai/code), install the skill plugin to give Claude accurate knowledge of `nuxt-protokit` APIs — schemas, composables, components, visualizations, offline persistence, and extensions.

```bash
/plugin marketplace add websideproject/nuxt-protokit
/plugin install nuxt-protokit-skills
```

The plugin provides:
- **`nuxt-protokit`** — `definePrototype`, `usePrototype`, `ProtoTool`, all field/viz types, collections, derived values, extensions, headless mode, and module authoring patterns

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
| useEncryptedIdb.ts | 88.03% | 70.58% | 78.78% | 95.04% |
| useProtoCollection.ts | 83.78% | 67.85% | 85.71% | 87.87% |
| useProtoDerived.ts | 88.23% | 75% | 100% | 88.23% |
| useProtoDoc.ts | 52.3% | 51.03% | 42.5% | 54.26% |
| useProtoList.ts | 85.24% | 73.68% | 100% | 94.33% |
| useProtoMap.ts | 98.43% | 91.66% | 100% | 100% |
| usePrototype.ts | 96.87% | 90% | 75% | 96.87% |
| **utils** | | | | |
| deepClone.ts | 100% | 100% | 100% | 100% |
| encryption.ts | 100% | 100% | 100% | 100% |
| formatters.ts | 94.73% | 89.36% | 100% | 96.42% |
| runMigrations.ts | 100% | 100% | 100% | 100% |
| **All files** | **50.55%** | **48.97%** | **42.91%** | **52.73%** |

> Coverage from 135 tests (`bun run test:coverage` in `packages/nuxt-protokit`). The calendar, text, outputs, permissions
> and registry composables have no unit tests yet; the playground exercises them.

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
