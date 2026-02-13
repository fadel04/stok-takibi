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
  type: 'دخول' | 'خروج' | 'تحديث'
  product: string
  quantity: number
  user: string
}

const { data: transactions } = await useFetch<Transaction[]>('/api/transactions')

const { data } = await useAsyncData('stock-movements', async () => {
  const transactionsList = transactions.value || []

  // تحويل آخر 10 عمليات إلى حركات مخزون
  const stockMovements: StockTransaction[] = transactionsList
    .slice(0, 10)
    .map((t) => {
      // تحديد نوع الحركة
      let type: 'دخول' | 'خروج' | 'تحديث' = 'تحديث'
      let quantity = 0

      // استخراج اسم المنتج والكمية من الوصف
      const match = t.description.match(/(.+?):\s*(\d+)\s*→\s*(\d+)\s*\(([+-]\d+)\)/)

      if (match) {
        const productName = match[1] || 'غير معروف'
        const diff = parseInt(match[4]!)

        quantity = Math.abs(diff)
        type = diff > 0 ? 'دخول' : 'خروج'

        return {
          id: t.id.toString(),
          date: t.timestamp,
          type,
          product: productName,
          quantity,
          user: t.username
        }
      }

      // إضافة منتج جديد
      const addMatch = t.description.match(/تمت إضافة منتج جديد:\s*(.+)/)
      if (addMatch) {
        return {
          id: t.id.toString(),
          date: t.timestamp,
          type: 'دخول',
          product: addMatch[1] || 'غير معروف',
          quantity: 0,
          user: t.username
        }
      }

      return {
        id: t.id.toString(),
        date: t.timestamp,
        type: 'تحديث',
        product: 'غير معروف',
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
    header: 'التاريخ',
    cell: ({ row }) => row.getValue('date')
  },
  {
    accessorKey: 'type',
    header: 'نوع العملية',
    cell: ({ row }) => {
      const type = row.getValue('type') as string
      const color = {
        دخول: 'success' as const,
        خروج: 'error' as const,
        تحديث: 'neutral' as const
      }[type]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => type)
    }
  },
  {
    accessorKey: 'product',
    header: 'المنتج'
  },
  {
    accessorKey: 'quantity',
    header: () => h('div', { class: 'text-right' }, 'الكمية'),
    cell: ({ row }) => {
      const quantity = row.getValue('quantity') as number
      const type = row.getValue('type') as string
      const sign = type === 'دخول' ? '+' : type === 'خروج' ? '-' : ''

      return h('div', { class: 'text-right font-medium' }, `${sign}${quantity}`)
    }
  },
  {
    accessorKey: 'user',
    header: 'المستخدم'
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
