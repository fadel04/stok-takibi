<script setup lang="ts">
import type { Product } from '~/types'

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface DBInvoice {
  id: number
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  totalAmount: number
  status: string
  createdAt: string | null
  items: InvoiceItem[]
}

type InvoiceStatus = 'pending' | 'paid' | 'overdue'

const toast = useToast()
const { currentUser } = useCurrentUser()
const { logTransaction } = useTransactionLogger()

const searchQuery = ref('')
const selectedStatus = ref<'all' | InvoiceStatus>('all')
const isAddOpen = ref(false)
const isViewOpen = ref(false)
const isLoading = ref(false)
const selectedInvoice = ref<DBInvoice | null>(null)

const { data: invoicesList, refresh } = await useFetch<DBInvoice[]>('/api/invoices', {
  lazy: true,
  default: () => []
})

const { data: products } = await useFetch<Product[]>('/api/products', {
  key: 'products',
  lazy: true,
  default: () => []
})

// ---- Form state ----
const form = reactive({
  customerName: '',
  customerPhone: '',
  notes: '',
  status: 'pending' as InvoiceStatus
})

const formItems = ref<InvoiceItem[]>([
  { description: '', quantity: 1, unitPrice: 0, total: 0 }
])

const addItem = () => {
  formItems.value.push({ description: '', quantity: 1, unitPrice: 0, total: 0 })
}

const removeItem = (i: number) => {
  if (formItems.value.length > 1) formItems.value.splice(i, 1)
}

const fillFromProduct = (i: number, productId: unknown) => {
  const id = Number(productId)
  const product = products.value?.find(p => p.id === id)
  if (!product) return
  const item = formItems.value[i]
  if (!item) return
  item.description = product.name
  item.unitPrice = product.price
  item.total = +(item.quantity * item.unitPrice).toFixed(2)
}

const updateItemTotal = (i: number) => {
  const item = formItems.value[i]
  if (item) item.total = +(item.quantity * item.unitPrice).toFixed(2)
}

const formTotal = computed(() =>
  formItems.value.reduce((s, i) => s + i.total, 0)
)

const resetForm = () => {
  form.customerName = ''
  form.customerPhone = ''
  form.notes = ''
  form.status = 'pending'
  formItems.value = [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]
}

const submitInvoice = async () => {
  if (!form.customerName.trim()) {
    toast.add({ title: 'اسم العميل مطلوب', color: 'error' })
    return
  }
  const validItems = formItems.value.filter(i => i.description.trim())
  if (!validItems.length) {
    toast.add({ title: 'أضف بنداً واحداً على الأقل', color: 'error' })
    return
  }
  isLoading.value = true
  try {
    await $fetch('/api/invoices', {
      method: 'POST',
      body: {
        customerName: form.customerName,
        customerPhone: form.customerPhone || null,
        customerEmail: null,
        totalAmount: formTotal.value,
        status: form.status,
        items: validItems,
        notes: form.notes
      }
    })
    await logTransaction(
      currentUser.value?.name || 'النظام',
      'تم إنشاء فاتورة',
      `فاتورة للعميل: ${form.customerName} - ${formTotal.value.toFixed(2)} MRU`
    )
    toast.add({ title: 'تم إنشاء الفاتورة', color: 'success' })
    isAddOpen.value = false
    resetForm()
    await refresh()
  } catch {
    toast.add({ title: 'حدث خطأ أثناء الحفظ', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const markAsPaid = async (invoice: DBInvoice) => {
  try {
    await $fetch('/api/invoices', {
      method: 'PUT',
      body: { ...invoice, items: invoice.items, status: 'paid' }
    })
    await logTransaction(currentUser.value?.name || 'النظام', 'تم دفع الفاتورة', `فاتورة #${invoice.id} - ${invoice.customerName}`)
    toast.add({ title: 'تم تحديث حالة الفاتورة إلى مدفوعة', color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: 'حدث خطأ', color: 'error' })
  }
}

const deleteInvoice = async (invoice: DBInvoice) => {
  try {
    await $fetch(`/api/invoices?id=${invoice.id}`, { method: 'DELETE' })
    await logTransaction(currentUser.value?.name || 'النظام', 'تم حذف الفاتورة', `فاتورة #${invoice.id} - ${invoice.customerName}`)
    toast.add({ title: 'تم حذف الفاتورة', color: 'success' })
    if (isViewOpen.value) isViewOpen.value = false
    await refresh()
  } catch {
    toast.add({ title: 'حدث خطأ أثناء الحذف', color: 'error' })
  }
}

const printInvoice = (invoice: DBInvoice) => {
  const w = window.open('', '', 'width=800,height=600')
  if (!w) return
  const sLabel = { paid: 'مدفوعة', pending: 'قيد الانتظار', overdue: 'متأخرة' }[invoice.status] || invoice.status
  const rows = (invoice.items || []).map(item => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${item.description}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.quantity}</td>
      <td style="padding:8px;border:1px solid #ddd">${item.unitPrice.toFixed(2)} MRU</td>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold">${item.total.toFixed(2)} MRU</td>
    </tr>`).join('')
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
    <title>فاتورة #${invoice.id}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;direction:rtl;color:#333}
    table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#f4f4f4;padding:10px;border:1px solid #ddd}
    .badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:13px}
    .paid{background:#d4edda;color:#155724}.pending{background:#fff3cd;color:#856404}.overdue{background:#f8d7da;color:#721c24}
    @media print{.no-print{display:none}}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:20px">
      <div><h1 style="margin:0;font-size:28px">فاتورة</h1><p style="margin:6px 0;color:#888;font-size:14px">رقم الفاتورة: #${invoice.id}</p></div>
      <div style="text-align:left"><span class="badge ${invoice.status}">${sLabel}</span>
      <p style="margin:8px 0 0;color:#888;font-size:13px">التاريخ: ${new Date(invoice.createdAt || '').toLocaleDateString('ar')}</p></div>
    </div>
    <p style="font-size:18px;font-weight:bold;margin-bottom:4px">${invoice.customerName}</p>
    ${invoice.customerPhone ? `<p style="color:#666;margin:0 0 20px">${invoice.customerPhone}</p>` : ''}
    <table><thead><tr><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div style="text-align:left;margin-top:12px;font-size:18px;font-weight:bold">
      الإجمالي الكلي: ${invoice.totalAmount.toFixed(2)} MRU
    </div>
    <div style="text-align:center;margin-top:50px" class="no-print">
      <button onclick="window.print()" style="padding:12px 36px;background:#22c55e;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px">طباعة</button>
    </div></body></html>`)
  w.document.close()
}

const filteredInvoices = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return (invoicesList.value || []).filter((inv) => {
    const matchSearch = inv.customerName.toLowerCase().includes(q) || String(inv.id).includes(q)
    const matchStatus = selectedStatus.value === 'all' || inv.status === selectedStatus.value
    return matchSearch && matchStatus
  })
})

const stats = computed(() => {
  const list = invoicesList.value || []
  return {
    count: list.length,
    paid: list.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0),
    pending: list.filter(i => i.status === 'pending').reduce((s, i) => s + i.totalAmount, 0),
    overdue: list.filter(i => i.status === 'overdue').reduce((s, i) => s + i.totalAmount, 0)
  }
})

const statusColor = (s: string): 'success' | 'warning' | 'error' | 'neutral' => {
  if (s === 'paid') return 'success'
  if (s === 'pending') return 'warning'
  if (s === 'overdue') return 'error'
  return 'neutral'
}
const statusLabel = (s: string) => ({ paid: 'مدفوعة', pending: 'قيد الانتظار', overdue: 'متأخرة' }[s] || s)

const productOptions = computed(() =>
  (products.value || []).map(p => ({ label: p.name, value: p.id }))
)

onMounted(() => {
  refresh()
})

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'الفواتير' })
</script>

<template>
  <UDashboardPanel id="invoices">
    <template #header>
      <UDashboardNavbar title="الفواتير">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" @click="isAddOpen = true">فاتورة جديدة</UButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="ابحث باسم العميل أو رقم الفاتورة..." class="w-72" />
        </template>
        <template #right>
          <div class="flex items-center gap-1 bg-elevated p-1 rounded-lg">
            <UButton
              v-for="s in [{ label: 'الكل', value: 'all' }, { label: 'مدفوعة', value: 'paid' }, { label: 'انتظار', value: 'pending' }, { label: 'متأخرة', value: 'overdue' }]"
              :key="s.value"
              :label="s.label"
              size="sm"
              :color="selectedStatus === s.value ? 'primary' : 'neutral'"
              :variant="selectedStatus === s.value ? 'solid' : 'ghost'"
              @click="selectedStatus = s.value as any"
            />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-5 p-4">
        <!-- Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="rounded-xl border border-default bg-elevated/30 p-4">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-lucide-file-text" class="size-4 text-muted" />
              <p class="text-sm text-muted">إجمالي الفواتير</p>
            </div>
            <p class="text-3xl font-bold">{{ stats.count }}</p>
          </div>
          <div class="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-lucide-check-circle" class="size-4 text-green-500" />
              <p class="text-sm text-green-700 dark:text-green-400">مدفوعة</p>
            </div>
            <p class="text-2xl font-bold text-green-600">{{ stats.paid.toFixed(0) }} <span class="text-sm font-normal">MRU</span></p>
          </div>
          <div class="rounded-xl border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30 p-4">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-lucide-clock" class="size-4 text-yellow-500" />
              <p class="text-sm text-yellow-700 dark:text-yellow-400">قيد الانتظار</p>
            </div>
            <p class="text-2xl font-bold text-yellow-600">{{ stats.pending.toFixed(0) }} <span class="text-sm font-normal">MRU</span></p>
          </div>
          <div class="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-lucide-alert-circle" class="size-4 text-red-500" />
              <p class="text-sm text-red-700 dark:text-red-400">متأخرة</p>
            </div>
            <p class="text-2xl font-bold text-red-600">{{ stats.overdue.toFixed(0) }} <span class="text-sm font-normal">MRU</span></p>
          </div>
        </div>

        <!-- Invoices Table -->
        <div class="rounded-xl border border-default overflow-hidden">
          <div v-if="!filteredInvoices.length" class="flex flex-col items-center justify-center py-16">
            <UIcon name="i-lucide-file-text" class="size-12 text-muted mb-3" />
            <p class="text-muted text-sm">لا توجد فواتير</p>
          </div>
          <table v-else class="w-full">
            <thead class="border-b border-default bg-elevated/50">
              <tr>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">#</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">العميل</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">التاريخ</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">المبلغ</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">الحالة</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted">الإجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="inv in filteredInvoices" :key="inv.id" class="hover:bg-elevated/30">
                <td class="px-4 py-3 text-sm text-muted font-mono">#{{ inv.id }}</td>
                <td class="px-4 py-3">
                  <p class="font-medium text-sm">{{ inv.customerName }}</p>
                  <p v-if="inv.customerPhone" class="text-xs text-muted">{{ inv.customerPhone }}</p>
                </td>
                <td class="px-4 py-3 text-sm text-muted">
                  {{ inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('ar') : '-' }}
                </td>
                <td class="px-4 py-3 text-sm font-semibold">{{ inv.totalAmount.toFixed(2) }} MRU</td>
                <td class="px-4 py-3">
                  <UBadge :color="statusColor(inv.status)" variant="subtle" size="sm">
                    {{ statusLabel(inv.status) }}
                  </UBadge>
                </td>
                <td class="px-4 py-3">
                  <div class="flex gap-1">
                    <UButton icon="i-lucide-eye" size="xs" color="neutral" variant="ghost" @click="selectedInvoice = inv; isViewOpen = true" />
                    <UButton icon="i-lucide-printer" size="xs" color="neutral" variant="ghost" @click="printInvoice(inv)" />
                    <UButton
                      v-if="inv.status !== 'paid'"
                      icon="i-lucide-check"
                      size="xs"
                      color="success"
                      variant="ghost"
                      @click="markAsPaid(inv)"
                    />
                    <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="deleteInvoice(inv)" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-muted">{{ filteredInvoices.length }} فاتورة معروضة</p>
      </div>
    </template>
  </UDashboardPanel>

  <!-- ===== Add Invoice Modal ===== -->
  <UModal v-model:open="isAddOpen" title="فاتورة جديدة" :ui="{ content: 'max-w-2xl' }">
    <template #body>
      <div class="space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="اسم العميل *">
            <UInput v-model="form.customerName" placeholder="اسم العميل" class="w-full" />
          </UFormField>
          <UFormField label="رقم الهاتف">
            <UInput v-model="form.customerPhone" placeholder="اختياري" class="w-full" />
          </UFormField>
        </div>

        <!-- Items -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <p class="font-semibold text-sm">بنود الفاتورة</p>
            <UButton icon="i-lucide-plus" size="xs" variant="outline" @click="addItem">إضافة بند</UButton>
          </div>

          <div class="space-y-2">
            <div
              v-for="(item, i) in formItems"
              :key="i"
              class="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-default"
            >
              <div class="col-span-5 space-y-1">
                <USelect
                  :items="productOptions"
                  placeholder="اختر من المنتجات..."
                  size="sm"
                  class="w-full"
                  @update:model-value="(v) => fillFromProduct(i, v)"
                />
                <UInput v-model="item.description" placeholder="وصف البند" size="sm" class="w-full" />
              </div>
              <UInput v-model.number="item.quantity" type="number" min="1" size="sm" class="col-span-2" @input="updateItemTotal(i)" />
              <UInput v-model.number="item.unitPrice" type="number" min="0" step="0.01" placeholder="السعر" size="sm" class="col-span-3" @input="updateItemTotal(i)" />
              <span class="col-span-1 text-center text-xs font-bold text-primary">{{ item.total.toFixed(0) }}</span>
              <UButton
                icon="i-lucide-x"
                size="xs"
                color="error"
                variant="ghost"
                class="col-span-1"
                :disabled="formItems.length === 1"
                @click="removeItem(i)"
              />
            </div>
          </div>

          <div class="flex justify-end mt-3 pt-3 border-t border-default">
            <p class="font-bold text-lg">الإجمالي: <span class="text-primary">{{ formTotal.toFixed(2) }} MRU</span></p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="الحالة">
            <USelect
              v-model="form.status"
              :items="[
                { label: 'قيد الانتظار', value: 'pending' },
                { label: 'مدفوعة', value: 'paid' },
                { label: 'متأخرة', value: 'overdue' }
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField label="ملاحظات">
            <UInput v-model="form.notes" placeholder="اختياري" class="w-full" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="outline" @click="isAddOpen = false; resetForm()">إلغاء</UButton>
          <UButton icon="i-lucide-save" :loading="isLoading" @click="submitInvoice">حفظ الفاتورة</UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- ===== View Invoice Modal ===== -->
  <UModal v-model:open="isViewOpen" title="تفاصيل الفاتورة" :ui="{ content: 'max-w-lg' }">
    <template #body>
      <div v-if="selectedInvoice" class="space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xl font-bold">{{ selectedInvoice.customerName }}</p>
            <p v-if="selectedInvoice.customerPhone" class="text-sm text-muted">{{ selectedInvoice.customerPhone }}</p>
            <p class="text-xs text-muted mt-1">
              {{ selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleDateString('ar') : '' }}
            </p>
          </div>
          <UBadge :color="statusColor(selectedInvoice.status)" variant="subtle" size="lg">
            {{ statusLabel(selectedInvoice.status) }}
          </UBadge>
        </div>

        <USeparator />

        <div class="space-y-2">
          <div
            v-for="(item, i) in selectedInvoice.items"
            :key="i"
            class="flex items-center justify-between text-sm py-1.5 border-b border-default last:border-0"
          >
            <span class="font-medium flex-1">{{ item.description }}</span>
            <span class="text-muted mx-3">{{ item.quantity }} × {{ item.unitPrice.toFixed(2) }}</span>
            <span class="font-semibold w-24 text-left">{{ item.total.toFixed(2) }} MRU</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t-2 border-default font-bold text-lg">
          <span>الإجمالي</span>
          <span class="text-primary">{{ selectedInvoice.totalAmount.toFixed(2) }} MRU</span>
        </div>

        <div class="flex gap-2 pt-2 flex-wrap">
          <UButton icon="i-lucide-printer" color="neutral" variant="outline" @click="printInvoice(selectedInvoice)">طباعة</UButton>
          <UButton
            v-if="selectedInvoice.status !== 'paid'"
            icon="i-lucide-check"
            color="success"
            variant="outline"
            @click="markAsPaid(selectedInvoice); isViewOpen = false"
          >
            تحديد كمدفوعة
          </UButton>
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" @click="deleteInvoice(selectedInvoice)">حذف</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
