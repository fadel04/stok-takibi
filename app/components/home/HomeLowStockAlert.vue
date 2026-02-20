<script setup lang="ts">
import type { Product } from '~/types'

const { threshold } = useLowStockThreshold()
const { data: products } = await useFetch<Product[]>('/api/products')

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
    <UAlert
      v-if="outOfStock.length > 0"
      color="error"
      icon="i-lucide-package-x"
      :title="`${outOfStock.length} منتج نفد من المخزون`"
    >
      <template #description>
        <div class="flex flex-wrap gap-2 mt-2">
          <UBadge
            v-for="p in outOfStock"
            :key="p.id"
            color="error"
            variant="subtle"
          >
            {{ p.name }}
          </UBadge>
        </div>
      </template>
    </UAlert>

    <!-- مخزون منخفض -->
    <UAlert
      v-if="lowStock.length > 0"
      color="warning"
      icon="i-lucide-alert-triangle"
      :title="`${lowStock.length} منتج على وشك النفاد (أقل من ${threshold} قطعة)`"
    >
      <template #description>
        <div class="flex flex-wrap gap-2 mt-2">
          <UBadge
            v-for="p in lowStock"
            :key="p.id"
            color="warning"
            variant="subtle"
          >
            {{ p.name }} — {{ p.stock }} قطعة
          </UBadge>
        </div>
      </template>
    </UAlert>
  </div>
</template>
