<template>
  <div class="h-full flex flex-col">
    <ClientOnly>
      <ProtoCalendar
        doc-key="playground-calendar"
        class="flex-1"
      />
      <template #fallback>
        <div class="flex-1 animate-pulse bg-muted rounded m-4" />
      </template>
    </ClientOnly>
  </div>
</template>
