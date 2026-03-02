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
