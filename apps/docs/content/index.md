---
title: protokit
description: A schema-driven, offline-first tool builder for Nuxt 4. Define a TypeScript schema and get a fully working interactive tool — forms, CRUD, computed values, visualizations, and automatic Y.js persistence.
seo:
  title: protokit — Schema-driven offline-first tool builder for Nuxt 4
  description: Define a TypeScript schema and get a complete interactive tool with forms, CRUD, computed values, visualizations, and automatic Y.js persistence.
---

::u-page-hero
#title
Build tools from schemas

#description
A Nuxt 4 module for building **schema-driven interactive tools** with offline-first persistence. Define a TypeScript schema. Get a complete, persistent, interactive tool.

#links
  :::u-button
  ---
  color: neutral
  size: xl
  to: /getting-started
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  color: neutral
  icon: simple-icons-github
  size: xl
  to: https://github.com/websideproject/nuxt-protokit
  variant: outline
  ---
  Star on GitHub
  :::
::

::u-page-section
#title
Everything from one schema

#features
  :::u-page-feature
  ---
  icon: i-lucide-layers
  ---
  #title
  12 field types

  #description
  text, number, textarea, select, segmented, toggle, range, rating, color, date, tags, and linked-responses — all schema-driven.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-database
  ---
  #title
  CRUD collections

  #description
  Offline-capable lists with search, sort, modal or inline editing, and preset packs — no boilerplate.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-calculator
  ---
  #title
  Derived values

  #description
  Pure reactive functions recomputed on every field or collection change. Chain them in definition order.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-bar-chart-2
  ---
  #title
  5 visualization types

  #description
  Progress bar, benchmark bar, bar chart, comparison table, feature matrix, and timeline — driven by schema.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-wifi-off
  ---
  #title
  Offline-first

  #description
  Y.js + IndexedDB — every write is local-first. Sync is async and automatic. Works on a plane.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-git-merge
  ---
  #title
  Cross-tool data flow

  #description
  Wire tools together with `produces`/`consumes` — a reactive data graph with automatic CRDT merge.
  :::
::
