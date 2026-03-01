# nuxt-protokit

<!-- automd:badges color="black" license name="@websideproject/nuxt-protokit" -->

[![npm version](https://img.shields.io/npm/v/@websideproject/nuxt-protokit?color=black)](https://npmjs.com/package/@websideproject/nuxt-protokit)
[![npm downloads](https://img.shields.io/npm/dm/@websideproject/nuxt-protokit?color=black)](https://npm.chart.dev/@websideproject/nuxt-protokit)
[![license](https://img.shields.io/github/license/websideproject/nuxt-protokit?color=black)](https://github.com/websideproject/nuxt-protokit/blob/main/LICENSE)

<!-- /automd -->

Schema-driven, offline-first tool builder for Nuxt 4. Define a TypeScript schema and get a fully working interactive tool — forms, CRUD, computed values, visualizations, and automatic Y.js persistence.

## ✨ Features

<!-- automd:file src=".github/snippets/features.md" -->

- 📋 **Schema-driven** — define fields, derived values, collections, and visualizations in one TypeScript object
- 📴 **Offline-first** — Y.js + IndexedDB means every write is local-first; sync is automatic on reconnect
- 🧮 **12 field types** — number, text, textarea, select, segmented, toggle, range, rating, color, date, tags, linked-responses
- 📊 **5 visualization types** — progress bar, benchmark bar, bar chart, comparison table, feature matrix, timeline
- 🔗 **Cross-tool data flow** — `produces`/`consumes` wire tools together via a reactive CRDT data graph
- 🛡️ **Corruption recovery** — auto-detect IndexedDB corruption and restore from server snapshots
- 🔄 **Multi-tab sync** — BroadcastChannel propagates edits across open tabs without a server round-trip

<!-- /automd -->

## 🚀 Installation

<!-- automd:file src=".github/snippets/installation.md" -->

Install the module and its peer dependencies:

```bash
# npm
npm install -D @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui

# pnpm
pnpm add -D @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui

# bun
bun add -D @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui
```

Then add it to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@websideproject/nuxt-protokit'],
  protokit: {
    serverSync: false, // set true to enable Y.js server sync
  },
})
```

<!-- /automd -->

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

## ❓ Questions & Support

<!-- automd:file src=".github/snippets/support.md" -->

- **Issues**: [Open an issue](https://github.com/websideproject/nuxt-protokit/issues) for bugs or feature requests
- **Discussions**: [Join the discussion](https://github.com/websideproject/nuxt-protokit/discussions) for questions and ideas

<!-- /automd -->

## 📄 License

<!-- automd:file src=".github/snippets/license.md" -->

Published under the [MIT](https://github.com/websideproject/nuxt-protokit/blob/main/LICENSE) license.

<!-- /automd -->
