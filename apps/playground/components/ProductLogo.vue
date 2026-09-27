<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-lg"
    :style="{ background: SURFACE, border: `1px solid ${VIOLET}66` }"
    role="img"
    aria-label="nuxt-protokit"
  >
    <svg
      class="w-[78%] overflow-visible"
      viewBox="0 0 20 8"
      aria-hidden="true"
    >
      <template
        v-for="(group, g) in GROUPS"
        :key="g"
      >
        <rect
          v-for="([x, y], i) in group.px"
          :key="i"
          :x="x"
          :y="y"
          width="1.5"
          height="1.5"
          :fill="group.fill"
        />
      </template>
    </svg>
  </span>
</template>

<script setup lang="ts">
// The nuxt-protokit mark: pixel art in the websideproject gradient on a dark tile — two peaks, violet and pink.
// Size it from the outside (`class="size-8"`); the mark fills 78% of the tile's width.
type Px = [number, number]

const VIOLET = '#9e7aff'
const PINK = '#fe8bbb'
const SURFACE = '#14141e'

const GROUPS: { px: Px[], fill: string }[] = [
  { px: [[6, 0], [4, 2], [8, 2], [2, 4], [10, 4], [0, 6], [2, 6], [4, 6], [6, 6], [8, 6], [10, 6], [12, 6]], fill: VIOLET },
  { px: [[14, 2], [12, 4], [16, 4], [10, 6], [12, 6], [14, 6], [16, 6], [18, 6]], fill: PINK },
]
</script>
