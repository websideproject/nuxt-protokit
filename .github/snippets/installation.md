Install the module and its peer dependencies:

```bash
# npm
npm install -D @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui

# yarn
yarn add -D @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui

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
