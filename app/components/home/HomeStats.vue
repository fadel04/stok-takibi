<script setup lang="ts">
import type { Period, Range, Stat } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

function formatCurrency(value: number): string {
  return value.toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  })
}

interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  category?: string
  createdAt: string
}

const { data: products, status } = await useFetch<Product[]>('/api/products')

const { data: stats } = await useAsyncData<Stat[]>('stats', async () => {
  const productsList = products.value || []

  // Toplam stok hesaplama
  const totalStock = productsList.reduce((sum, p) => sum + (p.stock || 0), 0)

  // Ürün sayısını hesaplama
  const totalProducts = productsList.length

  // Düşük stoklu ürünler (10'dan az)
  const lowStockProducts = productsList.filter(p => p.stock < 10).length

  // Toplam stok değeri hesaplama
  const totalValue = productsList.reduce((sum, p) => sum + (p.price * p.stock), 0)

  return [{
    title: 'Toplam Stok',
    icon: 'i-lucide-package',
    value: totalStock,
    variation: randomInt(-5, 15)
  }, {
    title: 'Ürünler',
    icon: 'i-lucide-boxes',
    value: totalProducts,
    variation: randomInt(-2, 8)
  }, {
    title: 'Stok Değeri',
    icon: 'i-lucide-circle-dollar-sign',
    value: formatCurrency(totalValue),
    variation: randomInt(-10, 20)
  }, {
    title: 'Düşük Stok',
    icon: 'i-lucide-alert-triangle',
    value: lowStockProducts,
    variation: randomInt(-30, -5)
  }]
}, {
  watch: [() => props.period, () => props.range, products],
  default: () => []
})
</script>

<template>
  <div v-if="status === 'pending'" class="flex items-center justify-center py-12">
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-gray-400 dark:text-gray-500" />
  </div>
  <UPageGrid v-else class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>

        <UBadge
          :color="stat.variation > 0 ? 'success' : 'error'"
          variant="subtle"
          class="text-xs"
        >
          {{ stat.variation > 0 ? '+' : '' }}{{ stat.variation }}%
        </UBadge>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
