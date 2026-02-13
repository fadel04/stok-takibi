<script setup lang="ts">
import type { Expense, Product } from '~/types'

const toast = useToast()
const { logTransaction } = useTransactionLogger()

type InvoiceStatus = 'paid' | 'pending' | 'overdue'

interface NormalizedInvoice {
  id: string
  customerName: string
  amount: number
  status: InvoiceStatus
  issueDate: string
  dueDate: string
}

interface RawInvoice {
  id?: string | number
  customerName?: string
  amount?: number | string
  totalAmount?: number | string
  status?: string
  issueDate?: string
  dueDate?: string
  createdAt?: string
}

interface ExpenseFormState {
  id?: number
  title: string
  category: string
  amount: number
  expenseDate: string
  notes: string
}

const searchQuery = ref('')
const selectedStatus = ref<'all' | InvoiceStatus>('all')
const expenseSearch = ref('')
const reportFromDate = ref('')
const reportToDate = ref('')
const expenseAggregationMode = ref<'monthly' | 'yearly'>('monthly')
const isExpenseModalOpen = ref(false)
const isEditingExpense = ref(false)
const isSavingExpense = ref(false)

const { data: rawInvoices, status: invoicesStatus, refresh: refreshInvoices } = await useFetch<RawInvoice[]>('/api/invoices', {
  lazy: true,
  default: () => []
})

const { data: products, status: productsStatus, refresh: refreshProducts } = await useFetch<Product[]>('/api/products', {
  lazy: true,
  default: () => []
})

const { data: expenses, status: expensesStatus, refresh: refreshExpenses } = await useFetch<Expense[]>('/api/expenses', {
  lazy: true,
  default: () => []
})

const statusLabels: Record<InvoiceStatus, string> = {
  paid: 'مدفوعة',
  pending: 'قيد الانتظار',
  overdue: 'متأخرة'
}

const expenseForm = reactive<ExpenseFormState>({
  title: '',
  category: 'تشغيل',
  amount: 0,
  expenseDate: new Date().toISOString().split('T')[0] || '',
  notes: ''
})

function normalizeDate(value: unknown): string {
  if (typeof value === 'string' && value.length >= 10) return value
  return new Date().toISOString().split('T')[0] || ''
}

function normalizeStatus(value: unknown): InvoiceStatus {
  if (value === 'paid' || value === 'pending' || value === 'overdue') return value
  return 'pending'
}

function normalizeInvoice(raw: RawInvoice): NormalizedInvoice {
  const amount = Number(raw.amount ?? raw.totalAmount ?? 0)
  const issueDate = normalizeDate(raw.issueDate ?? raw.createdAt)
  const dueDate = normalizeDate(raw.dueDate ?? raw.issueDate ?? raw.createdAt)

  return {
    id: String(raw.id ?? '-'),
    customerName: String(raw.customerName ?? 'غير محدد'),
    amount: Number.isFinite(amount) ? amount : 0,
    status: normalizeStatus(raw.status),
    issueDate,
    dueDate
  }
}

function formatMoney(value: number): string {
  return `MRU ${value.toFixed(2)}`
}

function isInReportRange(dateValue: string): boolean {
  const normalizedDate = normalizeDate(dateValue).slice(0, 10)

  if (reportFromDate.value && normalizedDate < reportFromDate.value) return false
  if (reportToDate.value && normalizedDate > reportToDate.value) return false

  return true
}

function clearReportDates() {
  reportFromDate.value = ''
  reportToDate.value = ''
}

function resetExpenseForm() {
  expenseForm.id = undefined
  expenseForm.title = ''
  expenseForm.category = 'تشغيل'
  expenseForm.amount = 0
  expenseForm.expenseDate = new Date().toISOString().split('T')[0] || ''
  expenseForm.notes = ''
}

function openAddExpenseModal() {
  isEditingExpense.value = false
  resetExpenseForm()
  isExpenseModalOpen.value = true
}

function openEditExpenseModal(expense: Expense) {
  isEditingExpense.value = true
  expenseForm.id = expense.id
  expenseForm.title = expense.title
  expenseForm.category = expense.category
  expenseForm.amount = expense.amount
  expenseForm.expenseDate = expense.expenseDate
  expenseForm.notes = expense.notes || ''
  isExpenseModalOpen.value = true
}

async function submitExpense() {
  if (!expenseForm.title.trim()) {
    toast.add({
      title: 'خطأ',
      description: 'أدخل اسم المصروف',
      color: 'error',
      icon: 'i-lucide-x'
    })
    return
  }

  if (expenseForm.amount <= 0) {
    toast.add({
      title: 'خطأ',
      description: 'قيمة المصروف يجب أن تكون أكبر من 0',
      color: 'error',
      icon: 'i-lucide-x'
    })
    return
  }

  isSavingExpense.value = true

  try {
    const payload = {
      title: expenseForm.title,
      category: expenseForm.category,
      amount: expenseForm.amount,
      expenseDate: expenseForm.expenseDate,
      notes: expenseForm.notes
    }

    if (isEditingExpense.value && expenseForm.id) {
      await $fetch('/api/expenses', {
        method: 'PUT',
        body: {
          id: expenseForm.id,
          ...payload
        }
      })

      await logTransaction('تحديث مصروف', `${expenseForm.title} - ${formatMoney(expenseForm.amount)}`)

      toast.add({
        title: 'نجاح',
        description: 'تم تحديث المصروف',
        color: 'success',
        icon: 'i-lucide-check'
      })
    } else {
      await $fetch('/api/expenses', {
        method: 'POST',
        body: payload
      })

      await logTransaction('إضافة مصروف', `${expenseForm.title} - ${formatMoney(expenseForm.amount)}`)

      toast.add({
        title: 'نجاح',
        description: 'تمت إضافة المصروف',
        color: 'success',
        icon: 'i-lucide-check'
      })
    }

    await refreshExpenses()
    isExpenseModalOpen.value = false
    resetExpenseForm()
  } catch (error: unknown) {
    toast.add({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'تعذر حفظ المصروف',
      color: 'error',
      icon: 'i-lucide-x'
    })
  } finally {
    isSavingExpense.value = false
  }
}

async function deleteExpense(expense: Expense) {
  const confirmed = await new Promise<boolean>((resolve) => {
    toast.add({
      title: 'هل أنت متأكد من الحذف؟',
      description: 'لا يمكن التراجع عن هذا الإجراء',
      actions: [
        {
          label: 'نعم، احذف',
          color: 'error',
          onClick: () => resolve(true)
        },
        {
          label: 'إلغاء',
          color: 'neutral',
          onClick: () => resolve(false)
        }
      ]
    })
  })

  if (!confirmed) return

  try {
    await $fetch(`/api/expenses?id=${expense.id}`, {
      method: 'DELETE'
    })

    await logTransaction('حذف مصروف', `${expense.title} - ${formatMoney(expense.amount)}`)

    toast.add({
      title: 'نجاح',
      description: 'تم حذف المصروف',
      color: 'success',
      icon: 'i-lucide-check'
    })

    await refreshExpenses()
  } catch (error: unknown) {
    toast.add({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'تعذر حذف المصروف',
      color: 'error',
      icon: 'i-lucide-x'
    })
  }
}

const invoices = computed<NormalizedInvoice[]>(() => {
  if (!Array.isArray(rawInvoices.value)) return []
  return rawInvoices.value.map(normalizeInvoice)
})

const filteredInvoices = computed(() => {
  return invoices.value.filter((invoice) => {
    const query = searchQuery.value.toLowerCase()
    const matchesSearch = invoice.id.toLowerCase().includes(query) || invoice.customerName.toLowerCase().includes(query)
    const matchesStatus = selectedStatus.value === 'all' || invoice.status === selectedStatus.value

    return matchesSearch && matchesStatus
  })
})

const filteredExpenses = computed(() => {
  const query = expenseSearch.value.toLowerCase()
  return (expenses.value || []).filter(expense =>
    expense.title.toLowerCase().includes(query) || expense.category.toLowerCase().includes(query)
  )
})

const reportInvoices = computed(() =>
  filteredInvoices.value.filter(invoice => isInReportRange(invoice.issueDate))
)

const reportExpenses = computed(() =>
  filteredExpenses.value.filter(expense => isInReportRange(expense.expenseDate))
)

const totalRevenue = computed(() =>
  reportInvoices.value
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0)
)

const receivables = computed(() =>
  reportInvoices.value
    .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.amount, 0)
)

const overdueAmount = computed(() =>
  reportInvoices.value
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.amount, 0)
)

const totalExpenses = computed(() =>
  reportExpenses.value.reduce((sum, expense) => sum + expense.amount, 0)
)

const stockValue = computed(() =>
  (products.value || []).reduce((sum, product) => sum + (product.price * product.stock), 0)
)

const profitEstimate = computed(() => totalRevenue.value - totalExpenses.value)

const topDebtors = computed(() => {
  const debtMap = new Map<string, number>()

  reportInvoices.value
    .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
    .forEach((inv) => {
      debtMap.set(inv.customerName, (debtMap.get(inv.customerName) || 0) + inv.amount)
    })

  return Array.from(debtMap.entries())
    .map(([customer, amount]) => ({ customer, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
})

const latestEntries = computed(() => {
  return [...reportInvoices.value]
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
    .slice(0, 12)
})

const expensesByPeriod = computed(() => {
  const grouped = new Map<string, number>()

  reportExpenses.value.forEach((expense) => {
    const date = new Date(expense.expenseDate)
    if (Number.isNaN(date.getTime())) return

    const key = expenseAggregationMode.value === 'monthly'
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : `${date.getFullYear()}`

    grouped.set(key, (grouped.get(key) || 0) + expense.amount)
  })

  return Array.from(grouped.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const maxExpensePeriodAmount = computed(() =>
  Math.max(1, ...expensesByPeriod.value.map(item => item.amount))
)

const hasLoading = computed(() => {
  return invoicesStatus.value === 'pending' || productsStatus.value === 'pending' || expensesStatus.value === 'pending'
})

function csvEscape(value: string | number): string {
  const stringValue = String(value ?? '')
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function exportAccountingCsv() {
  const rows: string[] = []

  rows.push('نوع التقرير,التاريخ')
  rows.push(`${csvEscape('تقرير محاسبي')},${csvEscape(new Date().toISOString().split('T')[0] || '')}`)
  rows.push(`من,${csvEscape(reportFromDate.value || '-')}`)
  rows.push(`إلى,${csvEscape(reportToDate.value || '-')}`)
  rows.push('')

  rows.push('الملخص,القيمة')
  rows.push(`${csvEscape('الإيراد المحصل')},${csvEscape(totalRevenue.value.toFixed(2))}`)
  rows.push(`${csvEscape('إجمالي المصروفات')},${csvEscape(totalExpenses.value.toFixed(2))}`)
  rows.push(`${csvEscape('صافي الربح التقديري')},${csvEscape(profitEstimate.value.toFixed(2))}`)
  rows.push(`${csvEscape('الذمم المدينة')},${csvEscape(receivables.value.toFixed(2))}`)
  rows.push(`${csvEscape('المبالغ المتأخرة')},${csvEscape(overdueAmount.value.toFixed(2))}`)
  rows.push(`${csvEscape('قيمة المخزون')},${csvEscape(stockValue.value.toFixed(2))}`)
  rows.push('')

  rows.push('المصروفات')
  rows.push('العنوان,الفئة,المبلغ,التاريخ,الملاحظات')
  reportExpenses.value.forEach((expense) => {
    rows.push([
      csvEscape(expense.title),
      csvEscape(expense.category),
      csvEscape(expense.amount.toFixed(2)),
      csvEscape(expense.expenseDate),
      csvEscape(expense.notes || '')
    ].join(','))
  })
  rows.push('')

  rows.push('الفواتير')
  rows.push('رقم الفاتورة,العميل,الحالة,المبلغ,تاريخ الإصدار,تاريخ الاستحقاق')
  reportInvoices.value.forEach((invoice) => {
    rows.push([
      csvEscape(invoice.id),
      csvEscape(invoice.customerName),
      csvEscape(statusLabels[invoice.status]),
      csvEscape(invoice.amount.toFixed(2)),
      csvEscape(invoice.issueDate),
      csvEscape(invoice.dueDate)
    ].join(','))
  })

  const csvContent = rows.join('\n')
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `accounting-report-${new Date().toISOString().split('T')[0] || 'today'}.csv`
  link.click()
  URL.revokeObjectURL(url)

  logTransaction('تصدير تقرير محاسبي', `تم تصدير تقرير محاسبي يحتوي ${reportInvoices.value.length} فاتورة و ${reportExpenses.value.length} مصروف`)
}

async function refreshAll() {
  await Promise.all([refreshInvoices(), refreshProducts(), refreshExpenses()])
}

useSeoMeta({
  title: 'المحاسبة'
})

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <UDashboardPanel id="accounting">
    <template #header>
      <UDashboardNavbar title="المحاسبة">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex gap-2">
            <UButton
              icon="i-lucide-download"
              color="primary"
              variant="outline"
              @click="exportAccountingCsv"
            >
              تصدير CSV
            </UButton>
            <UButton
              icon="i-lucide-plus"
              color="primary"
              @click="openAddExpenseModal"
            >
              إضافة مصروف
            </UButton>
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="outline"
              :loading="hasLoading"
              @click="refreshAll"
            >
              تحديث
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="ابحث بفاتورة أو عميل..."
            class="w-full max-w-xs"
          />
          <UInput
            v-model="expenseSearch"
            icon="i-lucide-receipt"
            placeholder="ابحث بمصروف..."
            class="w-full max-w-xs"
          />
          <UInput
            v-model="reportFromDate"
            type="date"
            placeholder="من"
            class="w-full max-w-[160px]"
          />
          <UInput
            v-model="reportToDate"
            type="date"
            placeholder="إلى"
            class="w-full max-w-[160px]"
          />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <USelect
              v-model="selectedStatus"
              :items="[
                { label: 'كل الحالات', value: 'all' },
                { label: 'مدفوعة', value: 'paid' },
                { label: 'قيد الانتظار', value: 'pending' },
                { label: 'متأخرة', value: 'overdue' }
              ]"
              color="neutral"
              variant="ghost"
            />
            <UButton
              v-if="reportFromDate || reportToDate"
              icon="i-lucide-eraser"
              color="neutral"
              variant="ghost"
              @click="clearReportDates"
            >
              مسح التاريخ
            </UButton>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="hasLoading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-gray-400 dark:text-gray-500" />
      </div>

      <div v-else class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <UCard>
            <template #header>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                الإيراد المحصل
              </p>
            </template>
            <p class="text-2xl font-bold text-green-600">
              {{ formatMoney(totalRevenue) }}
            </p>
          </UCard>

          <UCard>
            <template #header>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                إجمالي المصروفات
              </p>
            </template>
            <p class="text-2xl font-bold text-red-600">
              {{ formatMoney(totalExpenses) }}
            </p>
          </UCard>

          <UCard>
            <template #header>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                صافي الربح التقديري
              </p>
            </template>
            <p class="text-2xl font-bold" :class="profitEstimate >= 0 ? 'text-green-600' : 'text-red-600'">
              {{ formatMoney(profitEstimate) }}
            </p>
          </UCard>

          <UCard>
            <template #header>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                الذمم المدينة
              </p>
            </template>
            <p class="text-2xl font-bold text-yellow-600">
              {{ formatMoney(receivables) }}
            </p>
          </UCard>

          <UCard>
            <template #header>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                مبالغ متأخرة
              </p>
            </template>
            <p class="text-2xl font-bold text-orange-600">
              {{ formatMoney(overdueAmount) }}
            </p>
          </UCard>

          <UCard>
            <template #header>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                قيمة المخزون
              </p>
            </template>
            <p class="text-2xl font-bold text-primary">
              {{ formatMoney(stockValue) }}
            </p>
          </UCard>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <UCard class="xl:col-span-2">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">
                  آخر الحركات المحاسبية
                </h3>
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  {{ latestEntries.length }} حركة
                </span>
              </div>
            </template>

            <div v-if="latestEntries.length" class="overflow-x-auto">
              <table class="w-full">
                <thead class="border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th class="text-left text-xs text-gray-500 uppercase px-3 py-2">
                      التاريخ
                    </th>
                    <th class="text-left text-xs text-gray-500 uppercase px-3 py-2">
                      الفاتورة
                    </th>
                    <th class="text-left text-xs text-gray-500 uppercase px-3 py-2">
                      العميل
                    </th>
                    <th class="text-left text-xs text-gray-500 uppercase px-3 py-2">
                      الحالة
                    </th>
                    <th class="text-left text-xs text-gray-500 uppercase px-3 py-2">
                      المبلغ
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                  <tr v-for="entry in latestEntries" :key="entry.id + entry.issueDate">
                    <td class="px-3 py-2 text-sm">
                      {{ new Date(entry.issueDate).toLocaleDateString('ar') }}
                    </td>
                    <td class="px-3 py-2 text-sm font-medium">
                      {{ entry.id }}
                    </td>
                    <td class="px-3 py-2 text-sm">
                      {{ entry.customerName }}
                    </td>
                    <td class="px-3 py-2 text-sm">
                      <UBadge :color="entry.status === 'paid' ? 'success' : entry.status === 'overdue' ? 'error' : 'warning'" variant="subtle">
                        {{ statusLabels[entry.status] }}
                      </UBadge>
                    </td>
                    <td class="px-3 py-2 text-sm font-semibold">
                      {{ formatMoney(entry.amount) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-sm text-gray-500 dark:text-gray-400">
              لا توجد بيانات محاسبية مطابقة للفلاتر الحالية.
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="font-semibold">
                أعلى العملاء مديونية
              </h3>
            </template>

            <div v-if="topDebtors.length" class="space-y-3">
              <div
                v-for="debtor in topDebtors"
                :key="debtor.customer"
                class="flex items-center justify-between text-sm"
              >
                <span class="font-medium">{{ debtor.customer }}</span>
                <span class="text-red-600 font-semibold">{{ formatMoney(debtor.amount) }}</span>
              </div>
            </div>
            <div v-else class="text-sm text-gray-500 dark:text-gray-400">
              لا توجد ذمم مدينة حاليًا.
            </div>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold">
                تصنيف المصروفات
              </h3>
              <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <UButton
                  label="شهري"
                  size="xs"
                  :color="expenseAggregationMode === 'monthly' ? 'primary' : 'neutral'"
                  :variant="expenseAggregationMode === 'monthly' ? 'solid' : 'ghost'"
                  @click="expenseAggregationMode = 'monthly'"
                />
                <UButton
                  label="سنوي"
                  size="xs"
                  :color="expenseAggregationMode === 'yearly' ? 'primary' : 'neutral'"
                  :variant="expenseAggregationMode === 'yearly' ? 'solid' : 'ghost'"
                  @click="expenseAggregationMode = 'yearly'"
                />
              </div>
            </div>
          </template>

          <div v-if="expensesByPeriod.length" class="space-y-3">
            <div
              v-for="item in expensesByPeriod"
              :key="item.label"
              class="space-y-1"
            >
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium">{{ item.label }}</span>
                <span class="text-red-600 font-semibold">{{ formatMoney(item.amount) }}</span>
              </div>
              <div class="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <div
                  class="h-full rounded-full bg-primary transition-all duration-300"
                  :style="{ width: `${(item.amount / maxExpensePeriodAmount) * 100}%` }"
                />
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500 dark:text-gray-400">
            لا توجد بيانات مصروفات ضمن الفلاتر الحالية.
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">
                المصروفات
              </h3>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ reportExpenses.length }} سجل
              </span>
            </div>
          </template>

          <div v-if="reportExpenses.length" class="overflow-x-auto">
            <table class="w-full">
              <thead class="border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th class="text-left text-xs text-gray-500 uppercase px-3 py-2">
                    التاريخ
                  </th>
                  <th class="text-left text-xs text-gray-500 uppercase px-3 py-2">
                    العنوان
                  </th>
                  <th class="text-left text-xs text-gray-500 uppercase px-3 py-2">
                    الفئة
                  </th>
                  <th class="text-left text-xs text-gray-500 uppercase px-3 py-2">
                    المبلغ
                  </th>
                  <th class="text-left text-xs text-gray-500 uppercase px-3 py-2">
                    ملاحظات
                  </th>
                  <th class="text-left text-xs text-gray-500 uppercase px-3 py-2">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                <tr v-for="expense in reportExpenses" :key="expense.id">
                  <td class="px-3 py-2 text-sm">
                    {{ new Date(expense.expenseDate).toLocaleDateString('ar') }}
                  </td>
                  <td class="px-3 py-2 text-sm font-medium">
                    {{ expense.title }}
                  </td>
                  <td class="px-3 py-2 text-sm">
                    {{ expense.category }}
                  </td>
                  <td class="px-3 py-2 text-sm font-semibold text-red-600">
                    {{ formatMoney(expense.amount) }}
                  </td>
                  <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {{ expense.notes || '-' }}
                  </td>
                  <td class="px-3 py-2 text-sm">
                    <div class="flex gap-2">
                      <UButton
                        icon="i-lucide-edit"
                        color="primary"
                        variant="ghost"
                        size="xs"
                        @click="openEditExpenseModal(expense)"
                      />
                      <UButton
                        icon="i-lucide-trash"
                        color="error"
                        variant="ghost"
                        size="xs"
                        @click="deleteExpense(expense)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-sm text-gray-500 dark:text-gray-400">
            لا توجد مصروفات ضمن الفلاتر الحالية.
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isExpenseModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="isExpenseModalOpen = false"
      >
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ isEditingExpense ? 'تعديل مصروف' : 'إضافة مصروف' }}
                </h3>
              </div>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="isExpenseModalOpen = false"
              />
            </div>

            <div class="space-y-4">
              <UFormField label="عنوان المصروف" name="title">
                <UInput v-model="expenseForm.title" placeholder="مثال: إيجار المحل" />
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="الفئة" name="category">
                  <UInput v-model="expenseForm.category" placeholder="تشغيل / نقل / صيانة" />
                </UFormField>

                <UFormField label="المبلغ (MRU)" name="amount">
                  <UInput
                    v-model.number="expenseForm.amount"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </UFormField>
              </div>

              <UFormField label="تاريخ المصروف" name="expenseDate">
                <UInput v-model="expenseForm.expenseDate" type="date" />
              </UFormField>

              <UFormField label="ملاحظات" name="notes">
                <UTextarea v-model="expenseForm.notes" placeholder="ملاحظات إضافية (اختياري)" :rows="3" />
              </UFormField>

              <div class="flex justify-end gap-2 pt-2">
                <UButton
                  label="إلغاء"
                  color="neutral"
                  variant="ghost"
                  @click="isExpenseModalOpen = false"
                />
                <UButton
                  :label="isEditingExpense ? 'تحديث' : 'إضافة'"
                  :loading="isSavingExpense"
                  @click="submitExpense"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
</style>
