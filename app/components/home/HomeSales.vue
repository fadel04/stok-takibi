<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Period, Range } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

const UBadge = resolveComponent('UBadge')

interface Transaction {
  id: number
  username: string
  timestamp: string
  action: string
  description: string
}

interface StockTransaction {
  id: string
  date: string
  type: 'giriş' | 'çıkış' | 'güncelleme'
  product: string
  quantity: number
  user: string
}

const { data: transactions } = await useFetch<Transaction[]>('/api/transactions')

const { data } = await useAsyncData('stock-movements', async () => {
  const transactionsList = transactions.value || []

  // Son 10 işlemi al ve stok hareketlerine dönüştür
  const stockMovements: StockTransaction[] = transactionsList
    .slice(0, 10)
    .map((t) => {
      // İşlem tipini belirle
      let type: 'giriş' | 'çıkış' | 'güncelleme' = 'güncelleme'
      let quantity = 0

      // Description'dan ürün adı ve miktarı çıkar
      const match = t.description.match(/(.+?):\s*(\d+)\s*→\s*(\d+)\s*\(([+-]\d+)\)/)

      if (match) {
        const productName = match[1] || 'Bilinmeyen'
        const diff = parseInt(match[4]!)

        quantity = Math.abs(diff)
        type = diff > 0 ? 'giriş' : 'çıkış'

        return {
          id: t.id.toString(),
          date: t.timestamp,
          type,
          product: productName,
          quantity,
          user: t.username
        }
      }

      // Yeni ürün ekleme
      const addMatch = t.description.match(/Yeni ürün eklendi:\s*(.+)/)
      if (addMatch) {
        return {
          id: t.id.toString(),
          date: t.timestamp,
          type: 'giriş',
          product: addMatch[1] || 'Bilinmeyen',
          quantity: 0,
          user: t.username
        }
      }

      return {
        id: t.id.toString(),
        date: t.timestamp,
        type: 'güncelleme',
        product: 'Bilinmeyen',
        quantity: 0,
        user: t.username
      }
    })

  return stockMovements
}, {
  watch: [() => props.period, () => props.range, transactions],
  default: () => []
})

const columns: TableColumn<StockTransaction>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => `#${row.getValue('id')}`
  },
  {
    accessorKey: 'date',
    header: 'Tarih',
    cell: ({ row }) => row.getValue('date')
  },
  {
    accessorKey: 'type',
    header: 'İşlem Tipi',
    cell: ({ row }) => {
      const type = row.getValue('type') as string
      const color = {
        giriş: 'success' as const,
        çıkış: 'error' as const,
        güncelleme: 'neutral' as const
      }[type]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => type)
    }
  },
  {
    accessorKey: 'product',
    header: 'Ürün'
  },
  {
    accessorKey: 'quantity',
    header: () => h('div', { class: 'text-right' }, 'Miktar'),
    cell: ({ row }) => {
      const quantity = row.getValue('quantity') as number
      const type = row.getValue('type') as string
      const sign = type === 'giriş' ? '+' : type === 'çıkış' ? '-' : ''

      return h('div', { class: 'text-right font-medium' }, `${sign}${quantity}`)
    }
  },
  {
    accessorKey: 'user',
    header: 'Kullanıcı'
  }
]
</script>

<template>
  <UTable
    :data="data"
    :columns="columns"
    class="shrink-0"
    :ui="{
      base: 'table-fixed border-separate border-spacing-0',
      thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
      tbody: '[&>tr]:last:[&>td]:border-b-0',
      th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
      td: 'border-b border-default'
    }"
  />
</template>
