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
