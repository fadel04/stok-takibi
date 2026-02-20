<script setup lang="ts">
import type { Expense, Product } from '~/types'

type InvoiceStatus = 'paid' | 'pending' | 'overdue'

interface RawInvoice {
  id?: string | number
  customerName?: string
  totalAmount?: number | string
  status?: string
  createdAt?: string
}

interface NormalizedInvoice {
  id: string
  customerName: string
  amount: number
  status: InvoiceStatus
  date: string
}

interface ExpenseFormState {
  id?: number
  title: string
  category: string
  amount: number
  expenseDate: string
  notes: string
}

const toast = useToast()
const { logTransaction } = useTransactionLogger()
const { currentUser } = useCurrentUser()

// ── Tabs ──
const activeTab = ref<'overview' | 'expenses'>('overview')
const tabs = [
  { label: 'نظرة عامة', value: 'overview', icon: 'i-lucide-layout-dashboard' },
  { label: 'المصروفات', value: 'expenses', icon: 'i-lucide-receipt' }
]

// ── Date filter ──
const reportFromDate = ref('')
const reportToDate = ref('')
const expenseAggregationMode = ref<'monthly' | 'yearly'>('monthly')

// ── Expense modal ──
const isExpenseModalOpen = ref(false)
const isEditingExpense = ref(false)
const isSavingExpense = ref(false)
const expenseSearch = ref('')

const expenseForm = reactive<ExpenseFormState>({
  title: '',
  category: 'تشغيل',
  amount: 0,
  expenseDate: new Date().toISOString().split('T')[0] || '',
  notes: ''
})

const expenseCategories = ['تشغيل', 'إيجار', 'نقل', 'رواتب', 'صيانة', 'مشتريات', 'أخرى']

// ── Data fetching ──
const { data: rawInvoices, status: invoicesStatus, refresh: refreshInvoices } = await useFetch<RawInvoice[]>('/api/invoices', {
  lazy: true, default: () => []
})
const { data: products, status: productsStatus, refresh: refreshProducts } = await useFetch<Product[]>('/api/products', {
  key: 'products', lazy: true, default: () => []
})
const { data: expenses, status: expensesStatus, refresh: refreshExpenses } = await useFetch<Expense[]>('/api/expenses', {
  lazy: true, default: () => []
})

const hasLoading = computed(() =>
  invoicesStatus.value === 'pending' || productsStatus.value === 'pending' || expensesStatus.value === 'pending'
)

// ── Normalise invoices ──
const invoices = computed<NormalizedInvoice[]>(() =>
  (rawInvoices.value || []).map(r => ({
    id: String(r.id ?? '-'),
    customerName: String(r.customerName ?? 'غير محدد'),
    amount: Number.isFinite(Number(r.totalAmount)) ? Number(r.totalAmount) : 0,
    status: (['paid', 'pending', 'overdue'].includes(r.status ?? '') ? r.status : 'pending') as InvoiceStatus,
    date: (r.createdAt && r.createdAt.length >= 10) ? r.createdAt : new Date().toISOString()
  }))
)

function inRange(dateStr: string) {
  const d = dateStr.slice(0, 10)
  if (reportFromDate.value && d < reportFromDate.value) return false
  if (reportToDate.value && d > reportToDate.value) return false
  return true
}

const reportInvoices = computed(() => invoices.value.filter(i => inRange(i.date)))
const reportExpenses = computed(() => (expenses.value || []).filter(e => inRange(e.expenseDate)))

// ── KPIs ──
const totalRevenue = computed(() => reportInvoices.value.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0))
const receivables = computed(() => reportInvoices.value.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0))
const overdueAmount = computed(() => reportInvoices.value.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0))
const totalExpenses = computed(() => reportExpenses.value.reduce((s, e) => s + e.amount, 0))
const stockValue = computed(() => (products.value || []).reduce((s, p) => s + p.price * p.stock, 0))
const netProfit = computed(() => totalRevenue.value - totalExpenses.value)

// ── Top debtors ──
const topDebtors = computed(() => {
  const map = new Map<string, number>()
  reportInvoices.value.filter(i => i.status !== 'paid').forEach(i => map.set(i.customerName, (map.get(i.customerName) || 0) + i.amount))
  return [...map.entries()].map(([c, a]) => ({ customer: c, amount: a })).sort((a, b) => b.amount - a.amount).slice(0, 6)
})

// ── Recent invoices ──
const recentInvoices = computed(() =>
  [...reportInvoices.value].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
)

// ── Expenses by period ──
const expensesByPeriod = computed(() => {
  const map = new Map<string, number>()
  reportExpenses.value.forEach((e) => {
    const d = new Date(e.expenseDate)
    if (isNaN(d.getTime())) return
    const key = expenseAggregationMode.value === 'monthly'
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : `${d.getFullYear()}`
    map.set(key, (map.get(key) || 0) + e.amount)
  })
  return [...map.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => a.label.localeCompare(b.label))
})
const maxExpense = computed(() => Math.max(1, ...expensesByPeriod.value.map(i => i.amount)))

// ── Expenses by category ──
const expensesByCategory = computed(() => {
  const map = new Map<string, number>()
  reportExpenses.value.forEach(e => map.set(e.category, (map.get(e.category) || 0) + e.amount))
  return [...map.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount)
})

// ── Filtered expenses ──
const filteredExpenses = computed(() => {
  const q = expenseSearch.value.toLowerCase()
  return reportExpenses.value.filter(e => e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
})

function formatMoney(v: number) { return `${v.toFixed(2)} MRU` }

// ── Expense CRUD ──
function openAddExpense() {
  isEditingExpense.value = false
  Object.assign(expenseForm, { id: undefined, title: '', category: 'تشغيل', amount: 0, expenseDate: new Date().toISOString().split('T')[0] || '', notes: '' })
  isExpenseModalOpen.value = true
}

function openEditExpense(expense: Expense) {
  isEditingExpense.value = true
  Object.assign(expenseForm, { id: expense.id, title: expense.title, category: expense.category, amount: expense.amount, expenseDate: expense.expenseDate, notes: expense.notes || '' })
  isExpenseModalOpen.value = true
}

async function submitExpense() {
  if (!expenseForm.title.trim() || expenseForm.amount <= 0) {
    toast.add({ title: 'تحقق من البيانات', color: 'error' })
    return
  }
  isSavingExpense.value = true
  try {
    const payload = { title: expenseForm.title, category: expenseForm.category, amount: expenseForm.amount, expenseDate: expenseForm.expenseDate, notes: expenseForm.notes }
    if (isEditingExpense.value && expenseForm.id) {
      await $fetch('/api/expenses', { method: 'PUT', body: { id: expenseForm.id, ...payload } })
      await logTransaction(currentUser.value?.name || 'النظام', 'تحديث مصروف', `${expenseForm.title} - ${formatMoney(expenseForm.amount)}`)
      toast.add({ title: 'تم تحديث المصروف', color: 'success' })
    } else {
      await $fetch('/api/expenses', { method: 'POST', body: payload })
      await logTransaction(currentUser.value?.name || 'النظام', 'إضافة مصروف', `${expenseForm.title} - ${formatMoney(expenseForm.amount)}`)
      toast.add({ title: 'تمت إضافة المصروف', color: 'success' })
    }
    await refreshExpenses()
    isExpenseModalOpen.value = false
  } catch {
    toast.add({ title: 'حدث خطأ', color: 'error' })
  } finally {
    isSavingExpense.value = false
  }
}

async function deleteExpense(expense: Expense) {
  try {
    await $fetch(`/api/expenses?id=${expense.id}`, { method: 'DELETE' })
    await logTransaction(currentUser.value?.name || 'النظام', 'حذف مصروف', `${expense.title} - ${formatMoney(expense.amount)}`)
    toast.add({ title: 'تم حذف المصروف', color: 'success' })
    await refreshExpenses()
  } catch {
    toast.add({ title: 'حدث خطأ', color: 'error' })
  }
}

// ── CSV Export ──
function exportCsv() {
  const rows = [
    'الملخص المالي',
    `الإيراد المحصل,${totalRevenue.value.toFixed(2)}`,
    `إجمالي المصروفات,${totalExpenses.value.toFixed(2)}`,
    `صافي الربح,${netProfit.value.toFixed(2)}`,
    `الذمم المدينة,${receivables.value.toFixed(2)}`,
    `قيمة المخزون,${stockValue.value.toFixed(2)}`,
    '',
    'المصروفات',
    'العنوان,الفئة,المبلغ,التاريخ',
    ...reportExpenses.value.map(e => `${e.title},${e.category},${e.amount.toFixed(2)},${e.expenseDate}`)
  ]
  const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `accounting-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function refreshAll() {
  await Promise.all([refreshInvoices(), refreshExpenses(), refreshProducts()])
}

onMounted(() => {
  refreshAll()
})

const statusLabel = (s: string) => ({ paid: 'مدفوعة', pending: 'قيد الانتظار', overdue: 'متأخرة' }[s] || s)
const statusColor = (s: string): 'success' | 'warning' | 'error' | 'neutral' => {
  if (s === 'paid') return 'success'
  if (s === 'pending') return 'warning'
  if (s === 'overdue') return 'error'
  return 'neutral'
}

useSeoMeta({ title: 'المحاسبة' })
definePageMeta({ layout: 'default' })
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
            <UButton icon="i-lucide-download" color="neutral" variant="outline" @click="exportCsv">تصدير CSV</UButton>
            <UButton icon="i-lucide-plus" @click="openAddExpense">إضافة مصروف</UButton>
            <UButton icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="hasLoading" @click="refreshAll" />
          </div>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <!-- Tabs -->
          <div class="flex items-center gap-1 bg-elevated p-1 rounded-lg">
            <UButton
              v-for="tab in tabs"
              :key="tab.value"
              :label="tab.label"
              :icon="tab.icon"
              size="sm"
              :color="activeTab === tab.value ? 'primary' : 'neutral'"
              :variant="activeTab === tab.value ? 'solid' : 'ghost'"
              @click="activeTab = tab.value as any"
            />
          </div>
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UInput v-model="reportFromDate" type="date" size="sm" class="w-36" />
            <span class="text-muted text-sm">←</span>
            <UInput v-model="reportToDate" type="date" size="sm" class="w-36" />
            <UButton
              v-if="reportFromDate || reportToDate"
              icon="i-lucide-x"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="reportFromDate = ''; reportToDate = ''"
            />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="hasLoading" class="flex items-center justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
      </div>

      <div v-else class="space-y-6 p-4">

        <!-- ══ OVERVIEW TAB ══ -->
        <template v-if="activeTab === 'overview'">

          <!-- KPI Cards -->
          <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <div class="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4 xl:col-span-1">
              <div class="flex items-center gap-2 mb-2">
                <UIcon name="i-lucide-trending-up" class="size-4 text-green-500" />
                <p class="text-xs text-green-700 dark:text-green-400 font-medium">الإيراد المحصل</p>
              </div>
              <p class="text-xl font-bold text-green-600">{{ totalRevenue.toFixed(0) }}</p>
              <p class="text-xs text-green-600 mt-1">MRU</p>
            </div>

            <div class="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
              <div class="flex items-center gap-2 mb-2">
                <UIcon name="i-lucide-trending-down" class="size-4 text-red-500" />
                <p class="text-xs text-red-700 dark:text-red-400 font-medium">المصروفات</p>
              </div>
              <p class="text-xl font-bold text-red-600">{{ totalExpenses.toFixed(0) }}</p>
              <p class="text-xs text-red-600 mt-1">MRU</p>
            </div>

            <div
              class="rounded-xl border p-4"
              :class="netProfit >= 0
                ? 'border-green-300 dark:border-green-800 bg-green-100 dark:bg-green-950/50'
                : 'border-red-300 dark:border-red-800 bg-red-100 dark:bg-red-950/50'"
            >
              <div class="flex items-center gap-2 mb-2">
                <UIcon name="i-lucide-circle-dollar-sign" class="size-4" :class="netProfit >= 0 ? 'text-green-500' : 'text-red-500'" />
                <p class="text-xs font-medium" :class="netProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'">صافي الربح</p>
              </div>
              <p class="text-xl font-bold" :class="netProfit >= 0 ? 'text-green-700' : 'text-red-700'">{{ netProfit.toFixed(0) }}</p>
              <p class="text-xs mt-1" :class="netProfit >= 0 ? 'text-green-600' : 'text-red-600'">MRU</p>
            </div>

            <div class="rounded-xl border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30 p-4">
              <div class="flex items-center gap-2 mb-2">
                <UIcon name="i-lucide-clock" class="size-4 text-yellow-500" />
                <p class="text-xs text-yellow-700 dark:text-yellow-400 font-medium">الذمم المدينة</p>
              </div>
              <p class="text-xl font-bold text-yellow-600">{{ receivables.toFixed(0) }}</p>
              <p class="text-xs text-yellow-600 mt-1">MRU</p>
            </div>

            <div class="rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-4">
              <div class="flex items-center gap-2 mb-2">
                <UIcon name="i-lucide-alert-circle" class="size-4 text-orange-500" />
                <p class="text-xs text-orange-700 dark:text-orange-400 font-medium">متأخرة</p>
              </div>
              <p class="text-xl font-bold text-orange-600">{{ overdueAmount.toFixed(0) }}</p>
              <p class="text-xs text-orange-600 mt-1">MRU</p>
            </div>

            <div class="rounded-xl border border-default bg-elevated/30 p-4">
              <div class="flex items-center gap-2 mb-2">
                <UIcon name="i-lucide-package" class="size-4 text-primary" />
                <p class="text-xs text-muted font-medium">قيمة المخزون</p>
              </div>
              <p class="text-xl font-bold text-primary">{{ stockValue.toFixed(0) }}</p>
              <p class="text-xs text-muted mt-1">MRU</p>
            </div>
          </div>

          <!-- Recent Invoices + Top Debtors -->
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <!-- Recent Invoices -->
            <div class="xl:col-span-2 rounded-xl border border-default overflow-hidden">
              <div class="flex items-center justify-between px-4 py-3 border-b border-default bg-elevated/30">
                <h3 class="font-semibold text-sm">آخر الفواتير</h3>
                <UButton to="/invoices" size="xs" color="neutral" variant="ghost" icon="i-lucide-arrow-left">عرض الكل</UButton>
              </div>
              <div v-if="recentInvoices.length" class="divide-y divide-default">
                <div v-for="inv in recentInvoices" :key="inv.id" class="flex items-center justify-between px-4 py-3">
                  <div>
                    <p class="text-sm font-medium">{{ inv.customerName }}</p>
                    <p class="text-xs text-muted">{{ new Date(inv.date).toLocaleDateString('ar') }}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <UBadge :color="statusColor(inv.status)" variant="subtle" size="sm">{{ statusLabel(inv.status) }}</UBadge>
                    <p class="text-sm font-semibold w-28 text-left">{{ inv.amount.toFixed(2) }} MRU</p>
                  </div>
                </div>
              </div>
              <div v-else class="flex items-center justify-center py-10 text-muted text-sm">لا توجد فواتير</div>
            </div>

            <!-- Top Debtors -->
            <div class="rounded-xl border border-default overflow-hidden">
              <div class="px-4 py-3 border-b border-default bg-elevated/30">
                <h3 class="font-semibold text-sm">أعلى المديونيات</h3>
              </div>
              <div v-if="topDebtors.length" class="divide-y divide-default">
                <div v-for="d in topDebtors" :key="d.customer" class="flex items-center justify-between px-4 py-3">
                  <div class="flex items-center gap-2">
                    <UAvatar :alt="d.customer" size="xs" />
                    <span class="text-sm font-medium">{{ d.customer }}</span>
                  </div>
                  <span class="text-sm font-semibold text-red-500">{{ d.amount.toFixed(0) }} MRU</span>
                </div>
              </div>
              <div v-else class="flex items-center justify-center py-10 text-muted text-sm">لا توجد ذمم</div>
            </div>
          </div>
        </template>

        <!-- ══ EXPENSES TAB ══ -->
        <template v-if="activeTab === 'expenses'">

          <!-- Expense Stats -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="cat in expensesByCategory.slice(0, 4)" :key="cat.label" class="rounded-xl border border-default bg-elevated/30 p-4">
              <p class="text-xs text-muted mb-1">{{ cat.label }}</p>
              <p class="text-xl font-bold">{{ cat.amount.toFixed(0) }} <span class="text-sm font-normal text-muted">MRU</span></p>
              <div class="mt-2 h-1.5 rounded-full bg-default overflow-hidden">
                <div class="h-full rounded-full bg-primary" :style="{ width: `${(cat.amount / totalExpenses) * 100}%` }" />
              </div>
            </div>
          </div>

          <!-- Period Chart + Table side by side -->
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <!-- Bar Chart -->
            <div class="rounded-xl border border-default overflow-hidden">
              <div class="flex items-center justify-between px-4 py-3 border-b border-default bg-elevated/30">
                <h3 class="font-semibold text-sm">المصروفات حسب الفترة</h3>
                <div class="flex items-center gap-1 bg-elevated p-0.5 rounded-lg">
                  <UButton label="شهري" size="xs" :color="expenseAggregationMode === 'monthly' ? 'primary' : 'neutral'" :variant="expenseAggregationMode === 'monthly' ? 'solid' : 'ghost'" @click="expenseAggregationMode = 'monthly'" />
                  <UButton label="سنوي" size="xs" :color="expenseAggregationMode === 'yearly' ? 'primary' : 'neutral'" :variant="expenseAggregationMode === 'yearly' ? 'solid' : 'ghost'" @click="expenseAggregationMode = 'yearly'" />
                </div>
              </div>
              <div class="p-4 space-y-3">
                <div v-if="expensesByPeriod.length" v-for="item in expensesByPeriod" :key="item.label" class="space-y-1">
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium">{{ item.label }}</span>
                    <span class="text-red-500 font-semibold">{{ item.amount.toFixed(0) }} MRU</span>
                  </div>
                  <div class="h-2 rounded-full bg-default overflow-hidden">
                    <div class="h-full rounded-full bg-red-400 transition-all duration-300" :style="{ width: `${(item.amount / maxExpense) * 100}%` }" />
                  </div>
                </div>
                <p v-else class="text-center text-muted text-sm py-6">لا توجد بيانات</p>
              </div>
            </div>

            <!-- Expense Category Breakdown -->
            <div class="rounded-xl border border-default overflow-hidden">
              <div class="px-4 py-3 border-b border-default bg-elevated/30">
                <h3 class="font-semibold text-sm">توزيع المصروفات</h3>
              </div>
              <div class="p-4 space-y-2">
                <div v-if="expensesByCategory.length" v-for="cat in expensesByCategory" :key="cat.label" class="flex items-center justify-between">
                  <div class="flex items-center gap-2 flex-1">
                    <span class="text-sm">{{ cat.label }}</span>
                    <div class="flex-1 h-1.5 rounded-full bg-default overflow-hidden mx-2">
                      <div class="h-full rounded-full bg-primary" :style="{ width: `${(cat.amount / totalExpenses) * 100}%` }" />
                    </div>
                  </div>
                  <span class="text-sm font-semibold w-24 text-left">{{ cat.amount.toFixed(0) }} MRU</span>
                </div>
                <p v-else class="text-center text-muted text-sm py-6">لا توجد مصروفات</p>
              </div>
            </div>
          </div>

          <!-- Expenses Table -->
          <div class="rounded-xl border border-default overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-default bg-elevated/30">
              <h3 class="font-semibold text-sm">جميع المصروفات <span class="text-muted font-normal">({{ filteredExpenses.length }})</span></h3>
              <UInput v-model="expenseSearch" icon="i-lucide-search" placeholder="ابحث..." size="sm" class="w-48" />
            </div>
            <div v-if="filteredExpenses.length" class="divide-y divide-default">
              <div v-for="expense in filteredExpenses" :key="expense.id" class="flex items-center gap-3 px-4 py-3">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium">{{ expense.title }}</p>
                  <p class="text-xs text-muted">{{ expense.category }} · {{ new Date(expense.expenseDate).toLocaleDateString('ar') }}</p>
                </div>
                <p class="text-sm font-semibold text-red-500">{{ expense.amount.toFixed(2) }} MRU</p>
                <div class="flex gap-1">
                  <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="openEditExpense(expense)" />
                  <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="deleteExpense(expense)" />
                </div>
              </div>
            </div>
            <div v-else class="flex items-center justify-center py-10 text-muted text-sm">لا توجد مصروفات</div>
          </div>
        </template>

      </div>
    </template>
  </UDashboardPanel>

  <!-- Expense Modal -->
  <UModal v-model:open="isExpenseModalOpen" :title="isEditingExpense ? 'تعديل مصروف' : 'إضافة مصروف'">
    <template #body>
      <div class="space-y-4">
        <UFormField label="عنوان المصروف *">
          <UInput v-model="expenseForm.title" placeholder="مثال: إيجار المحل" class="w-full" />
        </UFormField>
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="الفئة">
            <USelect
              v-model="expenseForm.category"
              :items="expenseCategories.map(c => ({ label: c, value: c }))"
              class="w-full"
            />
          </UFormField>
          <UFormField label="المبلغ (MRU) *">
            <UInput v-model.number="expenseForm.amount" type="number" min="0" step="0.01" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="التاريخ">
          <UInput v-model="expenseForm.expenseDate" type="date" class="w-full" />
        </UFormField>
        <UFormField label="ملاحظات">
          <UTextarea v-model="expenseForm.notes" placeholder="اختياري" :rows="2" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="outline" @click="isExpenseModalOpen = false">إلغاء</UButton>
          <UButton :loading="isSavingExpense" @click="submitExpense">{{ isEditingExpense ? 'تحديث' : 'إضافة' }}</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
