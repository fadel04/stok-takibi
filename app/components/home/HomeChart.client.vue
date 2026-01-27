<script setup lang="ts">
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format } from 'date-fns'
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { Period, Range } from '~/types'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
}>()

type DataRecord = {
  date: Date
  stockLevel: number
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

const { width } = useElementSize(cardRef)

const data = ref<DataRecord[]>([])
const { data: products } = await useFetch<Product[]>('/api/products')

// Mevcut toplam stoğu hesaplama
const currentTotalStock = computed(() => {
  return (products.value || []).reduce((sum, p) => sum + (p.stock || 0), 0)
})

watch([() => props.period, () => props.range], () => {
  const dates = ({
    daily: eachDayOfInterval,
    weekly: eachWeekOfInterval,
    monthly: eachMonthOfInterval
  } as Record<Period, typeof eachDayOfInterval>)[props.period](props.range)

  // Zaman içinde stok değişimlerini simüle etme
  const baseStock = currentTotalStock.value || 2000
  const variation = baseStock * 0.15 // %15 değişim

  data.value = dates.map((date, index) => {
    // Stok için kademeli eğri oluşturma
    const trend = Math.sin(index / dates.length * Math.PI * 2) * variation
    const randomVariation = (Math.random() - 0.5) * (variation * 0.3)
    const stockLevel = Math.round(baseStock + trend + randomVariation)

    return { date, stockLevel }
  })
}, { immediate: true })

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.stockLevel

const average = computed(() => {
  if (data.value.length === 0) return 0
  return Math.round(data.value.reduce((acc: number, { stockLevel }) => acc + stockLevel, 0) / data.value.length)
})

const formatDate = (date: Date): string => {
  return ({
    daily: format(date, 'd MMM'),
    weekly: format(date, 'd MMM'),
    monthly: format(date, 'MMM yyy')
  })[props.period]
}

const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) {
    return ''
  }

  return formatDate(data.value[i].date)
}

const template = (d: DataRecord) => `${formatDate(d.date)}: ${d.stockLevel.toLocaleString('tr-TR')} adet`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Ortalama Stok Seviyesi
        </p>
        <p class="text-3xl text-highlighted font-semibold">
          {{ average.toLocaleString('tr-TR') }} <span class="text-base text-muted">adet</span>
        </p>
      </div>
    </template>

    <VisXYContainer
      :data="data"
      :padding="{ top: 40 }"
      class="h-96"
      :width="width"
    >
      <VisLine
        :x="x"
        :y="y"
        color="var(--ui-primary)"
      />
      <VisArea
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :opacity="0.1"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />

      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
