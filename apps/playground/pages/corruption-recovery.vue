<script setup lang="ts">
import type { PrototypeSchema, ComputeContext } from '#protokit/types'
import { formatMoney } from '#protokit/utils/formatters'

// Same doc key shared with the break-even page to allow testing corruption on that document
const DOC_KEY = 'playground-break-even'

const schema: PrototypeSchema = {
  key: DOC_KEY,
  title: 'Corruption Recovery Test',
  shortTitle: 'Recovery Test',
  description: 'Change a value, corrupt the stored document, and see the recovery modal.',
  icon: 'i-lucide-database-zap',
  tags: ['demo'],
  defaultCols: 2,

  fields: {
    fixedCosts: {
      type: 'number',
      label: 'Fixed Costs',
      default: 5000,
      leading: '$',
      trailing: '/mo',
    },
    pricePerUnit: {
      type: 'number',
      label: 'Price per Unit',
      default: 99,
      leading: '$',
    },
    costPerUnit: {
      type: 'number',
      label: 'Cost per Unit',
      default: 20,
      leading: '$',
    },
  },

  derived: {
    margin: {
      compute: (ctx: ComputeContext) => ctx.fields.pricePerUnit - ctx.fields.costPerUnit,
    },
    breakEven: {
      compute: (ctx: ComputeContext) => {
        const m = ctx.derived.margin
        if (m <= 0) return Infinity
        return Math.ceil(ctx.fields.fixedCosts / m)
      },
    },
  },

  results: [
    {
      title: 'Results',
      statCols: 2,
      stats: (ctx: ComputeContext) => [
        {
          label: 'Contribution Margin',
          value: formatMoney(ctx.derived.margin),
          valueClass: ctx.derived.margin > 0 ? 'text-emerald-600' : 'text-red-500',
        },
        {
          label: 'Break-Even Units',
          value: ctx.derived.breakEven === Infinity ? '∞' : String(ctx.derived.breakEven),
          valueClass: ctx.derived.breakEven < 200 ? 'text-emerald-600' : 'text-amber-500',
        },
      ],
    },
  ],
}

// Append bytes that are not a valid Y.js update to this document's IndexedDB update log (the store y-indexeddb
// writes to), then reload: loading the document fails, and ProtoTool opens the recovery modal.
async function corruptStore() {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(`proto:${DOC_KEY}`)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('updates', 'readwrite')
      tx.objectStore('updates').add(new Uint8Array([255, 255, 255, 255, 1, 2, 3]))
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
  })
  location.reload()
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8 space-y-6">
    <UAlert
      icon="i-lucide-info"
      color="neutral"
      variant="subtle"
      title="How to test corruption recovery"
      description="Corrupt this tool's IndexedDB store: the page reloads, loading the document fails, and the recovery modal opens. The document is shared with the Break-Even page."
    >
      <template #actions>
        <UButton
          icon="i-lucide-bomb"
          color="error"
          variant="subtle"
          size="sm"
          @click="corruptStore"
        >
          Corrupt the stored document
        </UButton>
      </template>
    </UAlert>

    <ClientOnly>
      <ProtoTool
        :schema="schema"
        :doc-key="DOC_KEY"
        disable-sync
      />
      <template #fallback>
        <div class="space-y-4 animate-pulse">
          <div class="h-10 bg-muted rounded" />
          <div class="h-10 bg-muted rounded" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
