<script setup lang="ts">
import type { Expense } from '~/types'

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

// ── Date filter ──
const fromDate = ref('')
const toDate = ref('')
const searchQuery = ref('')
const aggregationMode = ref<'monthly' | 'yearly'>('monthly')

// ── Modal ──
const isModalOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)

const expenseCategories = ['تشغيل', 'إيجار', 'نقل', 'رواتب', 'صيانة', 'مشتريات', 'أخرى']

const form = reactive<ExpenseFormState>({
  title: '',
  category: 'تشغيل',
  amount: 0,
  expenseDate: new Date().toISOString().split('T')[0] || '',
  notes: ''
})

// ── Data ──
const { data: expenses, refresh } = await useFetch<Expense[]>('/api/expenses', {
  lazy: true,
  default: () => []
})

onMounted(() => refresh())

function inRange(dateStr: string) {
  const d = dateStr.slice(0, 10)
  if (fromDate.value && d < fromDate.value) return false
  if (toDate.value && d > toDate.value) return false
  return true
}

const filtered = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return (expenses.value || []).filter(e =>
    inRange(e.expenseDate)
    && (e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
  )
})

// ── KPIs ──
const totalAmount = computed(() => filtered.value.reduce((s, e) => s + e.amount, 0))
const avgAmount = computed(() => filtered.value.length ? totalAmount.value / filtered.value.length : 0)

const byCategory = computed(() => {
  const map = new Map<string, number>()
  filtered.value.forEach(e => map.set(e.category, (map.get(e.category) || 0) + e.amount))
  return [...map.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount)
})

const byPeriod = computed(() => {
  const map = new Map<string, number>()
  filtered.value.forEach((e) => {
    const d = new Date(e.expenseDate)
    if (isNaN(d.getTime())) return
    const key = aggregationMode.value === 'monthly'
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : `${d.getFullYear()}`
    map.set(key, (map.get(key) || 0) + e.amount)
  })
  return [...map.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => a.label.localeCompare(b.label))
})

const maxPeriod = computed(() => Math.max(1, ...byPeriod.value.map(i => i.amount)))

// ── CRUD ──
function openAdd() {
  isEditing.value = false
  Object.assign(form, {
    id: undefined,
    title: '',
    category: 'تشغيل',
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0] || '',
    notes: ''
  })
  isModalOpen.value = true
}

function openEdit(expense: Expense) {
  isEditing.value = true
  Object.assign(form, {
    id: expense.id,
    title: expense.title,
    category: expense.category,
    amount: expense.amount,
    expenseDate: expense.expenseDate,
    notes: expense.notes || ''
  })
  isModalOpen.value = true
}

async function submit() {
  if (!form.title.trim() || form.amount <= 0) {
    toast.add({ title: 'تحقق من البيانات', color: 'error' })
    return
  }
  isSaving.value = true
  try {
    const payload = {
      title: form.title,
      category: form.category,
      amount: form.amount,
      expenseDate: form.expenseDate,
      notes: form.notes
    }
    if (isEditing.value && form.id) {
      await $fetch('/api/expenses', { method: 'PUT', body: { id: form.id, ...payload } })
      await logTransaction(currentUser.value?.name || 'النظام', 'تحديث مصروف', `${form.title} - ${form.amount.toFixed(2)} MRU`)
      toast.add({ title: 'تم التحديث', color: 'success' })
    } else {
      await $fetch('/api/expenses', { method: 'POST', body: payload })
      await logTransaction(currentUser.value?.name || 'النظام', 'إضافة مصروف', `${form.title} - ${form.amount.toFixed(2)} MRU`)
      toast.add({ title: 'تمت الإضافة', color: 'success' })
    }
    await refresh()
    isModalOpen.value = false
  } catch {
    toast.add({ title: 'حدث خطأ', color: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function deleteExpense(expense: Expense) {
  try {
    await $fetch(`/api/expenses?id=${expense.id}`, { method: 'DELETE' })
    await logTransaction(currentUser.value?.name || 'النظام', 'حذف مصروف', `${expense.title} - ${expense.amount.toFixed(2)} MRU`)
    toast.add({ title: 'تم الحذف', color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: 'حدث خطأ', color: 'error' })
  }
}

function exportCsv() {
  const rows = [
    'العنوان,الفئة,المبلغ,التاريخ,ملاحظات',
    ...filtered.value.map(e => `${e.title},${e.category},${e.amount.toFixed(2)},${e.expenseDate},${e.notes || ''}`)
  ]
  const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'المصروفات' })
</script>

<template>
  <UDashboardPanel id="expenses">
    <template #header>
      <UDashboardNavbar title="المصروفات">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex gap-2">
            <UButton icon="i-lucide-download" color="neutral" variant="outline" @click="exportCsv">تصدير CSV</UButton>
            <UButton icon="i-lucide-plus" @click="openAdd">إضافة مصروف</UButton>
          </div>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="ابحث بالعنوان أو الفئة..." class="w-64" />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UInput v-model="fromDate" type="date" size="sm" class="w-36" />
            <span class="text-muted text-sm">←</span>
            <UInput v-model="toDate" type="date" size="sm" class="w-36" />
            <UButton
              v-if="fromDate || toDate"
              icon="i-lucide-x"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="fromDate = ''; toDate = ''"
            />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-6 p-4">

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-lucide-wallet" class="size-4 text-red-500" />
              <p class="text-xs text-red-700 dark:text-red-400 font-medium">إجمالي المصروفات</p>
            </div>
            <p class="text-2xl font-bold text-red-600">{{ totalAmount.toFixed(0) }}</p>
            <p class="text-xs text-red-500 mt-1">MRU</p>
          </div>

          <div class="rounded-xl border border-default bg-elevated/30 p-4">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-lucide-list" class="size-4 text-muted" />
              <p class="text-xs text-muted font-medium">عدد المصروفات</p>
            </div>
            <p class="text-2xl font-bold">{{ filtered.length }}</p>
            <p class="text-xs text-muted mt-1">سجل</p>
          </div>

          <div class="rounded-xl border border-default bg-elevated/30 p-4">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-lucide-calculator" class="size-4 text-muted" />
              <p class="text-xs text-muted font-medium">المتوسط</p>
            </div>
            <p class="text-2xl font-bold">{{ avgAmount.toFixed(0) }}</p>
            <p class="text-xs text-muted mt-1">MRU</p>
          </div>

          <div class="rounded-xl border border-default bg-elevated/30 p-4">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-lucide-tag" class="size-4 text-muted" />
              <p class="text-xs text-muted font-medium">أعلى فئة</p>
            </div>
            <p class="text-lg font-bold truncate">{{ byCategory[0]?.label || '-' }}</p>
            <p class="text-xs text-muted mt-1">{{ byCategory[0] ? byCategory[0].amount.toFixed(0) + ' MRU' : '' }}</p>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <!-- Bar Chart by Period -->
          <div class="rounded-xl border border-default overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-default bg-elevated/30">
              <h3 class="font-semibold text-sm">المصروفات حسب الفترة</h3>
              <div class="flex items-center gap-1 bg-elevated p-0.5 rounded-lg">
                <UButton label="شهري" size="xs" :color="aggregationMode === 'monthly' ? 'primary' : 'neutral'" :variant="aggregationMode === 'monthly' ? 'solid' : 'ghost'" @click="aggregationMode = 'monthly'" />
                <UButton label="سنوي" size="xs" :color="aggregationMode === 'yearly' ? 'primary' : 'neutral'" :variant="aggregationMode === 'yearly' ? 'solid' : 'ghost'" @click="aggregationMode = 'yearly'" />
              </div>
            </div>
            <div class="p-4 space-y-3">
              <div v-if="byPeriod.length" v-for="item in byPeriod" :key="item.label" class="space-y-1">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium">{{ item.label }}</span>
                  <span class="text-red-500 font-semibold">{{ item.amount.toFixed(0) }} MRU</span>
                </div>
                <div class="h-2 rounded-full bg-default overflow-hidden">
                  <div class="h-full rounded-full bg-red-400 transition-all duration-300" :style="{ width: `${(item.amount / maxPeriod) * 100}%` }" />
                </div>
              </div>
              <p v-else class="text-center text-muted text-sm py-6">لا توجد بيانات</p>
            </div>
          </div>

          <!-- Category Breakdown -->
          <div class="rounded-xl border border-default overflow-hidden">
            <div class="px-4 py-3 border-b border-default bg-elevated/30">
              <h3 class="font-semibold text-sm">توزيع المصروفات حسب الفئة</h3>
            </div>
            <div class="p-4 space-y-3">
              <div v-if="byCategory.length" v-for="cat in byCategory" :key="cat.label">
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="font-medium">{{ cat.label }}</span>
                  <span class="font-semibold">{{ cat.amount.toFixed(0) }} MRU <span class="text-muted font-normal">({{ totalAmount > 0 ? ((cat.amount / totalAmount) * 100).toFixed(0) : 0 }}%)</span></span>
                </div>
                <div class="h-2 rounded-full bg-default overflow-hidden">
                  <div class="h-full rounded-full bg-primary transition-all duration-300" :style="{ width: `${totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0}%` }" />
                </div>
              </div>
              <p v-else class="text-center text-muted text-sm py-6">لا توجد مصروفات</p>
            </div>
          </div>
        </div>

        <!-- Expenses Table -->
        <div class="rounded-xl border border-default overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-default bg-elevated/30">
            <h3 class="font-semibold text-sm">
              جميع المصروفات
              <span class="text-muted font-normal">({{ filtered.length }})</span>
            </h3>
          </div>

          <div v-if="!filtered.length" class="flex flex-col items-center justify-center py-16">
            <UIcon name="i-lucide-receipt" class="size-12 text-muted mb-3" />
            <p class="text-muted text-sm">لا توجد مصروفات</p>
          </div>

          <table v-else class="w-full">
            <thead class="border-b border-default bg-elevated/50">
              <tr>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">العنوان</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">الفئة</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">المبلغ</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">التاريخ</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">ملاحظات</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">إجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="expense in filtered" :key="expense.id" class="hover:bg-elevated/30">
                <td class="px-4 py-3 text-sm font-medium">{{ expense.title }}</td>
                <td class="px-4 py-3">
                  <UBadge color="neutral" variant="subtle" size="sm">{{ expense.category }}</UBadge>
                </td>
                <td class="px-4 py-3 text-sm font-semibold text-red-500">{{ expense.amount.toFixed(2) }} MRU</td>
                <td class="px-4 py-3 text-sm text-muted">{{ new Date(expense.expenseDate).toLocaleDateString('ar') }}</td>
                <td class="px-4 py-3 text-sm text-muted">{{ expense.notes || '-' }}</td>
                <td class="px-4 py-3">
                  <div class="flex gap-1">
                    <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="openEdit(expense)" />
                    <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="deleteExpense(expense)" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </template>
  </UDashboardPanel>

  <!-- Modal -->
  <UModal v-model:open="isModalOpen" :title="isEditing ? 'تعديل مصروف' : 'إضافة مصروف'">
    <template #body>
      <div class="space-y-4">
        <UFormField label="عنوان المصروف *">
          <UInput v-model="form.title" placeholder="مثال: إيجار المحل" class="w-full" />
        </UFormField>
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="الفئة">
            <USelect
              v-model="form.category"
              :items="expenseCategories.map(c => ({ label: c, value: c }))"
              class="w-full"
            />
          </UFormField>
          <UFormField label="المبلغ (MRU) *">
            <UInput v-model.number="form.amount" type="number" min="0" step="0.01" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="التاريخ">
          <UInput v-model="form.expenseDate" type="date" class="w-full" />
        </UFormField>
        <UFormField label="ملاحظات">
          <UTextarea v-model="form.notes" placeholder="اختياري" :rows="2" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="outline" @click="isModalOpen = false">إلغاء</UButton>
          <UButton :loading="isSaving" @click="submit">{{ isEditing ? 'تحديث' : 'إضافة' }}</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
