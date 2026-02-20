<script setup lang="ts">
import { UBadge, UButton } from '#components'
import type { Transaction } from '~/types'

const searchQuery = ref('')
const activeTab = ref<'all' | 'inputs' | 'outputs'>('all')
const selectedCategory = ref<string>('all')

const tabs = [{
  label: 'الكل',
  value: 'all',
  icon: 'i-lucide-list'
}, {
  label: 'المدخلات',
  value: 'inputs',
  icon: 'i-lucide-package-plus'
}, {
  label: 'المخرجات',
  value: 'outputs',
  icon: 'i-lucide-package-minus'
}]

const { data: categoriesList } = await useFetch<{ id: number, name: string }[]>('/api/categories', {
  lazy: true,
  default: () => []
})

const categoryTabs = computed(() => [
  { label: 'الكل', value: 'all' },
  ...(categoriesList.value?.map(c => ({ label: c.name, value: c.name })) ?? [])
])

const { isAdmin } = useRole()
const isClearModalOpen = ref(false)
const isClearing = ref(false)

const clearTransactions = async () => {
  isClearing.value = true
  try {
    await $fetch('/api/transactions/clear', { method: 'DELETE' })
    await refresh()
    isClearModalOpen.value = false
    toast.add({ title: 'تم تصفير السجل بنجاح', color: 'success' })
  } catch {
    toast.add({ title: 'حدث خطأ أثناء التصفير', color: 'error' })
  } finally {
    isClearing.value = false
  }
}

const toast = useToast()

const { data: transactions, refresh, status } = await useFetch<Transaction[]>('/api/transactions', {
  lazy: true,
  default: () => []
})

const { data: products } = await useFetch<Array<{ id: number, name: string, category: string, size?: string }>>('/api/products', {
  lazy: true,
  default: () => []
})

const filteredTransactions = computed(() => {
  if (!transactions.value || !Array.isArray(transactions.value)) return []

  let filtered = transactions.value

  if (activeTab.value === 'inputs') {
    filtered = filtered.filter(t =>
      t.action === 'تمت إضافة منتج'
      || (t.description?.includes('→') && t.description?.includes('+'))
    )
  } else if (activeTab.value === 'outputs') {
    filtered = filtered.filter(t =>
      t.action === 'إخراج مخزون'
      || (t.description?.includes('→') && t.description?.includes('-'))
    )
  }

  return filtered.filter((transaction) => {
    const matchesSearch
      = transaction.username?.toLowerCase().includes(searchQuery.value.toLowerCase())
        || transaction.action?.toLowerCase().includes(searchQuery.value.toLowerCase())
        || transaction.description?.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesCategory = selectedCategory.value === 'all'
      || extractProductCategory(transaction.description) === selectedCategory.value

    return matchesSearch && matchesCategory
  })
})

const extractProductName = (description: string): string => {
  if (!description) return '-'

  if (description.includes('eklendi:')) {
    const parts = description.split('eklendi:')
    if (parts[1]) {
      return parts[1].trim()
    }
  }

  const match = description.match(/^([^:→]+)/)
  if (match && match[1]) {
    return match[1].trim()
  }

  return '-'
}

const extractProductSize = (description: string): string => {
  if (!description || !products.value) return '-'

  const productName = extractProductName(description)
  if (productName === '-') return '-'

  const product = products.value.find(p =>
    p.name.trim().toLowerCase() === productName.trim().toLowerCase()
  )

  if (product && product.size) {
    return product.size
  }

  return '-'
}

const extractProductCategory = (description: string): string => {
  if (!description || !products.value) return ''

  const productName = extractProductName(description)
  if (productName === '-') return ''

  const product = products.value.find(p =>
    p.name.toLowerCase() === productName.toLowerCase()
  )

  if (product && product.category) {
    return product.category
  }

  // Fallback: check if any known category name appears in description
  const matchedCategory = categoriesList.value?.find(c =>
    new RegExp(c.name, 'i').test(description)
  )
  if (matchedCategory) return matchedCategory.name

  return ''
}

const getActionColor = (action: string): 'success' | 'info' | 'primary' | 'error' | 'warning' | 'neutral' => {
  const actionColors: Record<string, 'success' | 'info' | 'primary' | 'error' | 'warning' | 'neutral'> = {
    'تمت إضافة منتج': 'success',
    'تم تحديث المخزون': 'info',
    'إخراج مخزون': 'error',
    'تمت إضافة عميل': 'success',
    'تم إنشاء فاتورة': 'primary',
    'تم حذف المنتج': 'error',
    'تم تحديث المنتج': 'info',
    'تم تحديث السعر': 'warning',
    'تم دفع الفاتورة': 'success',
    'تم تحديث بيانات العميل': 'info',
    'تم حذف العميل': 'error'
  }
  return actionColors[action] || 'neutral'
}

const printReport = () => {
  const printWindow = window.open('', '', 'width=800,height=600')
  if (!printWindow) return

  const tabName = activeTab.value === 'all'
    ? 'الكل'
    : activeTab.value === 'inputs'
      ? 'المدخلات'
      : 'المخرجات'

  const categoryName = selectedCategory.value === 'all'
    ? 'الكل'
    : selectedCategory.value

  const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>${tabName} Raporu</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
      }
      .header {
        text-align: left;
        margin-bottom: 30px;
        border-bottom: 2px solid #333;
        padding-bottom: 20px;
      }
      .header h1 {
        margin: 0;
        color: #333;
      }
      .header p {
        margin: 5px 0;
        color: #666;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }
      th {
        background-color: #f4f4f4;
        font-weight: bold;
      }
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      .badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
      }
      .badge-success { background-color: #d4edda; color: #155724; }
      .badge-error { background-color: #f8d7da; color: #721c24; }
      .badge-info { background-color: #d1ecf1; color: #0c5460; }
      .badge-warning { background-color: #fff3cd; color: #856404; }
      .footer {
        margin-top: 30px;
        text-align: center;
        color: #666;
        font-size: 12px;
        border-top: 1px solid #ddd;
        padding-top: 20px;
      }
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    </style>
    <` + `/head>
  <body>
    <div class="header">
      <h1>${tabName} Raporu</h1>
      <p>التاريخ: ${new Date().toLocaleDateString('ar')}</p>
      <p>الفئة: ${categoryName}</p>
      <p>إجمالي السجلات: ${filteredTransactions.value.length}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>No</th>
          <th>اسم المستخدم</th>
          <th>الوقت</th>
          <th>نوع العملية</th>
          <th>اسم المنتج</th>
          <th>المقاس</th>
          <th>الوصف</th>
        </tr>
      </thead>
      <tbody>
        ${filteredTransactions.value.map(t => `
          <tr>
            <td>${t.id}</td>
            <td>${t.username}</td>
            <td>${t.timestamp}</td>
            <td>
              <span class="badge badge-${getActionColor(t.action)}">
                ${t.action}
              </span>
            </td>
            <td>${extractProductName(t.description)}</td>
            <td>${extractProductSize(t.description)}</td>
            <td>${t.description}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
<div class="footer">
  <p>تاريخ الطباعة: ${new Date().toLocaleString('ar')}</p>
</div>
    <` + `/body>
    <` + `/html>`

  printWindow.document.write(htmlContent)
  printWindow.document.close()
  setTimeout(() => {
    printWindow.print()
  }, 250)
}

useSeoMeta({
  title: 'سجل العمليات'
})

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <UDashboardPanel id="gecmis">
    <template #header>
      <UDashboardNavbar title="سجل العمليات">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex gap-2">
            <UButton
              icon="i-lucide-printer"
              color="primary"
              variant="outline"
              @click="printReport"
            >
              طباعة
            </UButton>
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="outline"
              @click="() => refresh()"
              :loading="status === 'pending'"
            >
              تحديث
            </UButton>
            <UButton
              v-if="isAdmin"
              icon="i-lucide-trash-2"
              color="error"
              variant="outline"
              @click="isClearModalOpen = true"
            >
              تصفير السجل
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <UButton
                v-for="tab in tabs"
                :key="tab.value"
                :label="tab.label"
                :icon="tab.icon"
                :color="activeTab === tab.value ? 'primary' : 'neutral'"
                :variant="activeTab === tab.value ? 'solid' : 'ghost'"
                size="sm"
                @click="activeTab = tab.value as any"
              />
            </div>

            <div class="h-8 w-px bg-gray-300 dark:bg-gray-700"></div>

            <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <UButton
                v-for="category in categoryTabs"
                :key="category.value"
                :label="category.label"
                :color="selectedCategory === category.value ? 'primary' : 'neutral'"
                :variant="selectedCategory === category.value ? 'solid' : 'ghost'"
                size="sm"
                @click="selectedCategory = category.value as any"
              />
            </div>
          </div>
        </template>

        <template #right>
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="ابحث..."
            class="w-64"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="status === 'pending'" class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-gray-400 dark:text-gray-500 mb-3" />
        <p class="text-sm text-gray-600 dark:text-gray-400">
          جارٍ التحميل...
        </p>
      </div>

      <div v-else-if="!filteredTransactions.length" class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-lucide-file-text" class="size-12 text-gray-400 dark:text-gray-500 mb-3" />
        <p class="text-sm text-gray-600 dark:text-gray-400">لم يتم العثور على عمليات</p>
      </div>

      <div v-else class="space-y-4">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  No
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  اسم المستخدم
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  وقت العملية
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  نوع العملية
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  اسم المنتج
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المقاس
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الوصف
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr
                v-for="transaction in filteredTransactions"
                :key="transaction.id"
                class="hover:bg-gray-50 dark:hover:bg-gray-900/50"
              >
                <td class="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  {{ transaction.id }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-900 dark:text-white">
                  {{ transaction.username }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {{ transaction.timestamp }}
                </td>
                <td class="px-4 py-4 text-sm">
                  <UBadge
                    :color="getActionColor(transaction.action)"
                    variant="subtle"
                  >
                    {{ transaction.action }}
                  </UBadge>
                </td>
                <td class="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  {{ extractProductName(transaction.description) }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {{ extractProductSize(transaction.description) }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-md">
                  {{ transaction.description }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- الإحصائيات -->
        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-800">
          <span>إجمالي العمليات: {{ filteredTransactions.length }}</span>
          <span>{{ new Date().toLocaleDateString('ar') }}</span>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="isClearModalOpen" title="تصفير السجل">
    <template #body>
      <p class="text-sm text-muted mb-4">
        هل أنت متأكد من حذف جميع سجلات العمليات؟ لا يمكن التراجع عن هذا الإجراء.
      </p>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="isClearModalOpen = false">إلغاء</UButton>
        <UButton color="error" :loading="isClearing" @click="clearTransactions">تصفير</UButton>
      </div>
    </template>
  </UModal>
</template>
