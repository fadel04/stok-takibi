<script setup lang="ts">
import type { Product } from '~/types'

const { threshold } = useLowStockThreshold()
// Use same key as products page so data stays in sync after stock operations
const { data: products } = await useFetch<Product[]>('/api/products', { key: 'products' })

const outOfStock = computed(() =>
  products.value?.filter(p => p.stock === 0) ?? []
)

const lowStock = computed(() =>
  products.value?.filter(p => p.stock > 0 && p.stock <= threshold.value) ?? []
)
</script>

<template>
  <div v-if="outOfStock.length > 0 || lowStock.length > 0" class="space-y-3 mb-6">
    <!-- نفد المخزون -->
    <div
      v-if="outOfStock.length > 0"
      class="flex flex-col gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4"
    >
      <div class="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
        <UIcon name="i-lucide-package-x" class="size-5" />
        <span>{{ outOfStock.length }} منتج نفد من المخزون</span>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="p in outOfStock"
          :key="p.id"
          :to="`/products?q=${encodeURIComponent(p.name)}`"
          color="error"
          variant="soft"
          size="xs"
          trailing-icon="i-lucide-arrow-left"
          :label="p.name"
        />
      </div>
    </div>

    <!-- مخزون منخفض -->
    <div
      v-if="lowStock.length > 0"
      class="flex flex-col gap-3 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30 p-4"
    >
      <div class="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-semibold">
        <UIcon name="i-lucide-alert-triangle" class="size-5" />
        <span>{{ lowStock.length }} منتج على وشك النفاد (أقل من {{ threshold }} قطعة)</span>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="p in lowStock"
          :key="p.id"
          :to="`/products?q=${encodeURIComponent(p.name)}`"
          color="warning"
          variant="soft"
          size="xs"
          trailing-icon="i-lucide-arrow-right"
          :label="`${p.name} — ${p.stock} قطعة`"
        />
      </div>
    </div>
  </div>
</template>
