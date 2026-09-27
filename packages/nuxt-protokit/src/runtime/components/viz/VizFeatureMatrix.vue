<script setup>
defineProps({
  features: { type: Array, required: true },
  entities: { type: Array, required: true },
})
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-default">
          <th class="text-left p-2 text-muted font-medium">
            Feature
          </th>
          <th
            v-for="entity in entities"
            :key="entity.name"
            class="text-center p-2 text-muted font-medium"
          >
            {{ entity.name }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="feature in features"
          :key="feature"
          class="border-b border-muted"
        >
          <td class="p-2 text-highlighted">
            {{ feature }}
          </td>
          <td
            v-for="entity in entities"
            :key="entity.name"
            class="text-center p-2"
          >
            <UIcon
              v-if="entity.coverage[feature] === true"
              name="i-lucide-check"
              class="size-4 text-emerald-500"
            />
            <UIcon
              v-else-if="entity.coverage[feature] === 'partial'"
              name="i-lucide-minus"
              class="size-4 text-amber-500"
            />
            <UIcon
              v-else
              name="i-lucide-x"
              class="size-4 text-red-400"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
