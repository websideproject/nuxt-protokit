# @websideproject/nuxt-protokit

[![npm version](https://img.shields.io/npm/v/@websideproject/nuxt-protokit?color=black)](https://npmjs.com/package/@websideproject/nuxt-protokit)
[![npm downloads](https://img.shields.io/npm/dm/@websideproject/nuxt-protokit?color=black)](https://npm.chart.dev/@websideproject/nuxt-protokit)
[![license](https://img.shields.io/github/license/websideproject/nuxt-protokit?color=black)](https://github.com/websideproject/nuxt-protokit/blob/main/LICENSE)

Schema-driven prototyping for Nuxt 4. Describe a tool as one TypeScript object — fields, computed values, collections,
results and charts — and `<ProtoTool>` renders it, saved to IndexedDB through Y.js as you type.

- **One schema** — 12 field types, derived values, collections with CRUD, result cards, 12 chart and visualization types
- **Offline-first** — every edit is a local Y.js update persisted to IndexedDB; tabs stay in sync over BroadcastChannel
- **Headless** — use the persistence layer (`usePrototype`, `useProtoMap`, `useProtoList`, `useProtoText`) without any UI
- **Calendar, item panels, dashboards** — ready-made components that read the same schema
- **Migrations, namespaces, encryption** — versioned schemas, per-tenant isolation, AES-GCM encrypted storage
- **Corruption recovery** and optional server backup to your own endpoints
- **Extensible** — custom field and visualization types via `defineProtokitExtension`
- **Nuxt 4** + **Nuxt UI** (v3 or v4)

## Install

```bash
npm install @websideproject/nuxt-protokit yjs y-indexeddb @nuxt/ui tailwindcss
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@websideproject/nuxt-protokit'],
  css: ['~/assets/css/main.css'],
  protokit: {
    serverSync: false, // local only; see "Server backup" below
  },
})
```

The components are styled with Tailwind classes, so Tailwind has to scan the module. Add one `@source` line to your
stylesheet (the path is relative to the CSS file):

```css
/* app/assets/css/main.css */
@import "tailwindcss";
@import "@nuxt/ui";

@source "../../../node_modules/@websideproject/nuxt-protokit";
```

## Quick start

```vue
<!-- app/pages/estimator.vue -->
<script setup lang="ts">
const estimator = definePrototype({
  key: 'resource-estimator', // also the IndexedDB key
  title: 'Resource Cost Estimator',
  shortTitle: 'Estimator',
  description: 'Estimate a project from team size, salaries and duration.',
  icon: 'i-lucide-calculator',

  fields: {
    teamSize: { type: 'number', label: 'Team size', default: 3, trailing: 'people' },
    avgMonthlySalary: { type: 'number', label: 'Avg. monthly salary', default: 4500, leading: '$' },
    months: { type: 'range', label: 'Duration (months)', min: 1, max: 24, step: 1, default: 6 },
  },

  derived: {
    monthlyCost: { compute: ({ fields }) => fields.teamSize * fields.avgMonthlySalary },
    projectTotal: { compute: ({ fields, derived }) => derived.monthlyCost * fields.months },
  },

  results: [{
    title: 'Cost summary',
    badge: ({ derived }) => derived.projectTotal < 50_000
      ? { label: 'Small project', color: 'primary' }
      : { label: 'Large project', color: 'warning' },
    stats: ({ derived }) => [
      { label: 'Monthly', value: formatMoney(derived.monthlyCost) },
      { label: 'Project total', value: formatMoney(derived.projectTotal) },
    ],
  }],

  visualizations: [{
    type: 'bar-chart',
    title: 'Monthly vs total',
    config: {
      type: 'bar-chart',
      data: ({ derived }) => [
        { label: 'Monthly', value: derived.monthlyCost },
        { label: 'Total', value: derived.projectTotal },
      ],
    },
  }],
})
</script>

<template>
  <ClientOnly>
    <ProtoTool :schema="estimator" />
  </ClientOnly>
</template>
```

A form, a result card with a badge and two stats, and a bar chart. Change a value and reload: it is still there,
read back from IndexedDB. `definePrototype`, `formatMoney`, the composables and every `Proto*` component are
auto-imported.

Without the UI:

```ts
const { state, derived, collections, isReady } = usePrototype(estimator)
state.teamSize.value = 5 // persisted
```

## Server backup

With `serverSync` enabled (the default is `true`) the client pushes each document's full Y.js state to your
backend and asks it for snapshots, which corruption recovery restores from:
`POST /api/yjs/sync`, `POST /api/yjs/snapshots/create`, `GET /api/yjs/snapshots/:key`,
`POST /api/yjs/snapshots/restore`, `GET /api/yjs/pull` (base URL configurable with
`serverSync: { baseUrl }`). Requests that fail are ignored, so the local copy keeps working without a backend;
set `serverSync: false` to make no requests at all. Protokit ships the client side only.

## Documentation

Full documentation: [websideproject.com/docs/nuxt-protokit](https://websideproject.com/docs/nuxt-protokit/getting-started)

- Getting started: [Introduction](https://websideproject.com/docs/nuxt-protokit/getting-started) · [Concepts](https://websideproject.com/docs/nuxt-protokit/getting-started/concepts) · [Quick start](https://websideproject.com/docs/nuxt-protokit/getting-started/quick-start)
- Schemas: [Overview](https://websideproject.com/docs/nuxt-protokit/schemas) · [Fields](https://websideproject.com/docs/nuxt-protokit/schemas/fields) · [Collections](https://websideproject.com/docs/nuxt-protokit/schemas/collections) · [Derived values](https://websideproject.com/docs/nuxt-protokit/schemas/derived-computed) · [Connections](https://websideproject.com/docs/nuxt-protokit/schemas/connections) · [Visualizations](https://websideproject.com/docs/nuxt-protokit/schemas/visualizations)
- Composables: [Overview](https://websideproject.com/docs/nuxt-protokit/composables) · [usePrototype](https://websideproject.com/docs/nuxt-protokit/composables/use-prototype) · [useProtoDoc](https://websideproject.com/docs/nuxt-protokit/composables/use-proto-doc) · [useProtoCollection](https://websideproject.com/docs/nuxt-protokit/composables/use-proto-collection)
- Components: [Overview](https://websideproject.com/docs/nuxt-protokit/components) · [ProtoTool](https://websideproject.com/docs/nuxt-protokit/components/proto-tool) · [ProtoCrudModal](https://websideproject.com/docs/nuxt-protokit/components/proto-crud-modal) · [ProtoCalendar](https://websideproject.com/docs/nuxt-protokit/components/proto-calendar) · [Item panels](https://websideproject.com/docs/nuxt-protokit/components/proto-item-panels)
- Offline-first: [Overview](https://websideproject.com/docs/nuxt-protokit/offline-first) · [Corruption recovery](https://websideproject.com/docs/nuxt-protokit/offline-first/corruption-recovery) · [Document size and GC](https://websideproject.com/docs/nuxt-protokit/offline-first/document-size-and-gc) · [Multi-tenant isolation](https://websideproject.com/docs/nuxt-protokit/offline-first/multi-tenant-isolation) · [Encryption](https://websideproject.com/docs/nuxt-protokit/offline-first/encryption)
- Advanced: [Building a toolkit](https://websideproject.com/docs/nuxt-protokit/advanced/building-a-toolkit) · [Schema patterns](https://websideproject.com/docs/nuxt-protokit/advanced/custom-schema-patterns) · [Extensibility](https://websideproject.com/docs/nuxt-protokit/advanced/extensibility) · [Permissions](https://websideproject.com/docs/nuxt-protokit/advanced/permissions) · [Business-logic guards](https://websideproject.com/docs/nuxt-protokit/advanced/permissions-business-logic) · [Headless mode](https://websideproject.com/docs/nuxt-protokit/advanced/headless-mode)
- [Claude Code skills](https://websideproject.com/docs/nuxt-protokit/claude-code-skills)

## Links

- [GitHub](https://github.com/websideproject/nuxt-protokit)
- [Issues](https://github.com/websideproject/nuxt-protokit/issues) · [Discussions](https://github.com/websideproject/nuxt-protokit/discussions)
- [Releases](https://github.com/websideproject/nuxt-protokit/releases)

## License

[MIT](https://github.com/websideproject/nuxt-protokit/blob/main/LICENSE)
