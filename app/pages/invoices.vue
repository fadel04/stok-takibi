<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import type { Invoice, User } from '~/types'

const toast = useToast()
const { logTransaction } = useTransactionLogger()
const table = useTemplateRef('table')

const schema = z.object({
  id: z.string().min(2, 'حرفان على الأقل'),
  customerName: z.number(),
  amount: z.number().min(0, 'لا يمكن أن يكون المبلغ أقل من 0'),
  issueDate: z.string(),
  dueDate: z.string(),
  status: z.enum(['paid', 'pending', 'overdue']),
  notes: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  id: '',
  customerName: undefined,
  amount: 0,
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date().toISOString().split('T')[0],
  status: 'pending',
  notes: ''
})

const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isViewModalOpen = ref(false)
const selectedInvoice = ref<Invoice | null>(null)
const isLoading = ref(false)
const searchQuery = ref('')
const selectedStatus = ref<'all' | 'paid' | 'pending' | 'overdue'>('all')

const { data: invoices, refresh } = await useFetch<Invoice[]>('/api/invoices', {
  lazy: true
})

const { data: customers } = await useFetch<User[]>('/api/customers')

const customerOptions = computed(() => {
  if (!customers.value) {
    return []
  }
  return customers.value.map(customer => ({
    label: customer.name,
    value: customer.id
  }))
})

const filteredInvoices = computed(() => {
  if (!invoices.value) return []

  return invoices.value.filter(invoice => {
    const matchesSearch =
      invoice.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesStatus = selectedStatus.value === 'all' || invoice.status === selectedStatus.value

    return matchesSearch && matchesStatus
  })
})

const stats = computed(() => {
  if (!invoices.value) return { total: 0, paid: 0, pending: 0, overdue: 0 }

  return {
    total: invoices.value.reduce((sum, inv) => sum + inv.amount, 0),
    paid: invoices.value.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
    pending: invoices.value.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0),
    overdue: invoices.value.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0)
  }
})

const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'pending':
      return 'warning'
    case 'overdue':
      return 'error'
    default:
      return 'neutral'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
      return 'مدفوعة'
    case 'pending':
      return 'قيد الانتظار'
    case 'overdue':
      return 'متأخرة'
    default:
      return status
  }
}

const columns: TableColumn<Invoice>[] = [
  {
    accessorKey: 'id',
    header: 'رقم الفاتورة',
    cell: ({ row }) => row.original.id
  },
  {
    accessorKey: 'customerName',
    header: 'العميل',
    cell: ({ row }) => row.original.customerName
  },
  {
    accessorKey: 'amount',
    header: 'المبلغ',
    cell: ({ row }) => `₺${row.original.amount.toFixed(2)}`
  },
  {
    accessorKey: 'issueDate',
    header: 'الإصدار',
    cell: ({ row }) => new Date(row.original.issueDate).toLocaleDateString('ar')
  },
  {
    accessorKey: 'dueDate',
    header: 'الاستحقاق',
    cell: ({ row }) => new Date(row.original.dueDate).toLocaleDateString('ar')
  },
  {
    accessorKey: 'status',
    header: 'الحالة',
    cell: ({ row }) => {
      const UBadge = resolveComponent('UBadge')
      return h(UBadge, {
        color: getStatusColor(row.original.status),
        variant: 'subtle'
      }, () => getStatusLabel(row.original.status))
    }
  },
  {
    id: 'actions',
    header: 'الإجراءات',
    cell: ({ row }) => {
      const UButton = resolveComponent('UButton')
      return h('div', { class: 'flex gap-2' }, [
        h(UButton, {
          icon: 'i-lucide-eye',
          color: 'info',
          variant: 'ghost',
          size: 'sm',
          onClick: () => openViewModal(row.original)
        }),
        h(UButton, {
          icon: 'i-lucide-edit',
          color: 'blue',
          variant: 'ghost',
          size: 'sm',
          onClick: () => openEditModal(row.original)
        }),
        h(UButton, {
          icon: 'i-lucide-download',
          color: 'success',
          variant: 'ghost',
          size: 'sm',
          onClick: () => downloadInvoice(row.original)
        }),
        h(UButton, {
          icon: 'i-lucide-trash',
          color: 'error',
          variant: 'ghost',
          size: 'sm',
          onClick: () => deleteInvoice(row.original.id)
        })
      ])
    }
  }
]

function openViewModal(invoice: Invoice) {
  selectedInvoice.value = invoice
  isViewModalOpen.value = true
}

function openEditModal(invoice: Invoice) {
  selectedInvoice.value = invoice
  state.id = invoice.id
  state.customerName = customers.value?.find(c => c.name === invoice.customerName)?.id
  state.amount = invoice.amount
  state.issueDate = new Date(invoice.issueDate).toISOString().split('T')[0]
  state.dueDate = new Date(invoice.dueDate).toISOString().split('T')[0]
  state.status = invoice.status
  state.notes = invoice.notes || ''
  isEditModalOpen.value = true
}

async function onSubmitAdd(event: FormSubmitEvent<Schema>) {
  isLoading.value = true
  try {
    await logTransaction(
      'تمت إضافة فاتورة',
      `تمت إضافة فاتورة جديدة: ${event.data.id} - العميل: ${event.data.customerName}`
    )

    await $fetch('/api/invoices', {
      method: 'POST',
      body: {
        ...event.data,
        customerName: customers.value?.find(c => c.id === event.data.customerName)?.name,
        items: [],
        paidDate: null
      }
    })

    toast.add({
      title: 'نجاح',
      description: 'تمت إضافة الفاتورة',
      icon: 'i-lucide-check',
      color: 'success'
    })

    isAddModalOpen.value = false
    resetForm()
    await refresh()
  }
  catch (error: unknown) {
    toast.add({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'تعذر إضافة الفاتورة',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
  finally {
    isLoading.value = false
  }
}

async function onSubmitEdit(event: FormSubmitEvent<Schema>) {
  if (!selectedInvoice.value) return

  isLoading.value = true
  try {
    await $fetch('/api/invoices', {
      method: 'PUT',
      body: {
        ...selectedInvoice.value,
        ...event.data,
        customerName: customers.value?.find(c => c.id === event.data.customerName)?.name
      }
    })

    await logTransaction(
      'تم تحديث الفاتورة',
      `تم تحديث الفاتورة: ${event.data.id} - العميل: ${event.data.customerName}`
    )

    toast.add({
      title: 'نجاح',
      description: 'تم تحديث الفاتورة',
      icon: 'i-lucide-check',
      color: 'success'
    })

    isEditModalOpen.value = false
    resetForm()
    await refresh()
  }
  catch (error: unknown) {
    toast.add({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'تعذر تحديث الفاتورة',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
  finally {
    isLoading.value = false
  }
}

async function downloadInvoice(invoice: Invoice) {
  const content = generateInvoicePDF(invoice)
  const element = document.createElement('a')
  element.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
  element.download = `${invoice.id}.txt`
  element.click()

  await logTransaction(
    'تم تنزيل الفاتورة',
    `تم تنزيل الفاتورة: ${invoice.id} - العميل: ${invoice.customerName}`
  )

  toast.add({
    title: 'نجاح',
    description: 'تم تنزيل الفاتورة',
    icon: 'i-lucide-check',
    color: 'success'
  })
}

function generateInvoicePDF(invoice: Invoice) {
  let content = `
================ F A T U R A ================

رقم الفاتورة: ${invoice.id}
التاريخ: ${new Date(invoice.issueDate).toLocaleDateString('ar')}
الاستحقاق: ${new Date(invoice.dueDate).toLocaleDateString('ar')}

--------------------------------------------
بيانات العميل
--------------------------------------------
${invoice.customerName}

--------------------------------------------
بنود الفاتورة
--------------------------------------------
`

  invoice.items?.forEach(item => {
    content += `\n${item.description}
  الكمية: ${item.quantity} x ₺${item.unitPrice.toFixed(2)} = ₺${item.total.toFixed(2)}\n`
  })

  content += `
--------------------------------------------
إجمالي المبلغ: ₺${invoice.amount.toFixed(2)}
الحالة: ${getStatusLabel(invoice.status)}
الملاحظات: ${invoice.notes || '-'}
--------------------------------------------
`

  return content
}

async function deleteInvoice(id: string) {
  const confirmed = await new Promise<boolean>(resolve => {
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

  const invoice = invoices.value?.find(inv => inv.id === id)

  try {
    await $fetch(`/api/invoices?id=${id}`, {
      method: 'DELETE'
    })

    if (invoice) {
      await logTransaction(
        'تم حذف الفاتورة',
        `تم حذف الفاتورة: ${invoice.id} - العميل: ${invoice.customerName} - المبلغ: ₺${invoice.amount.toFixed(2)}`
      )
    }

    toast.add({
      title: 'نجاح',
      description: 'تم حذف الفاتورة',
      icon: 'i-lucide-check',
      color: 'success'
    })

    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'خطأ',
      description: error.message || 'تعذر حذف الفاتورة',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
}

function resetForm() {
  state.id = ''
  state.customerName = undefined
  state.amount = 0
  state.issueDate = new Date().toISOString().split('T')[0]
  state.dueDate = new Date().toISOString().split('T')[0]
  state.status = 'pending'
  state.notes = ''
  selectedInvoice.value = null
}

</script>

<template>
  <UDashboardPanel id="invoices">
    <template #header>
      <UDashboardNavbar title="الفواتير">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="إضافة فاتورة"
            icon="i-lucide-plus"
            @click="isAddModalOpen = true"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="ابحث عن فاتورة..."
            class="w-full max-w-xs"
          />
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
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="invoices" class="space-y-6">
        <!-- بطاقات الإحصائيات -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-700 dark:text-gray-300">إجمالي المبلغ</span>
                <UIcon name="i-lucide-credit-card" class="size-5 text-primary" />
              </div>
            </template>
            <p class="text-3xl font-bold text-primary">₺{{ stats.total.toFixed(2) }}</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold text-green-700 dark:text-green-300">مدفوع</span>
                <UIcon name="i-lucide-check-circle" class="size-5 text-green-500" />
              </div>
            </template>
            <p class="text-3xl font-bold text-green-500">₺{{ stats.paid.toFixed(2) }}</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold text-yellow-700 dark:text-yellow-300">قيد الانتظار</span>
                <UIcon name="i-lucide-clock" class="size-5 text-yellow-500" />
              </div>
            </template>
            <p class="text-3xl font-bold text-yellow-500">₺{{ stats.pending.toFixed(2) }}</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold text-red-700 dark:text-red-300">متأخرة</span>
                <UIcon name="i-lucide-alert-circle" class="size-5 text-red-500" />
              </div>
            </template>
            <p class="text-3xl font-bold text-red-500">₺{{ stats.overdue.toFixed(2) }}</p>
          </UCard>
        </div>

        <!-- الفواتير Tablosu -->
        <UTable
          ref="table"
          :data="filteredInvoices"
          :columns="columns"
          :loading="!invoices"
        />

        <div class="text-sm text-gray-600 dark:text-gray-400">
          إجمالي {{ filteredInvoices.length }} فاتورة معروضة
        </div>
      </div>
      <div v-else class="text-center py-12">
        <UIcon name="i-lucide-loader" class="size-8 animate-spin mx-auto" />
      </div>
    </template>
  </UDashboardPanel>

  <!-- إضافة فاتورة Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="isAddModalOpen = false">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  إضافة فاتورة جديدة
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  املأ النموذج لإضافة فاتورة جديدة
                </p>
              </div>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="isAddModalOpen = false"
              />
            </div>

            <UForm
              :schema="schema"
              :state="state"
              class="space-y-4"
              @submit="onSubmitAdd"
            >
              <UFormField label="رقم الفاتورة" name="id">
                <UInput v-model="state.id" placeholder="أدخل رقم الفاتورة" />
              </UFormField>

              <UFormField label="اسم العميل" name="customerName">
                <USelectMenu
                  v-model="state.customerName"
                  :options="customerOptions"
                  placeholder="اختر العميل"
                  searchable
                />
              </UFormField>

              <UFormField label="المبلغ (₺)" name="amount">
                <UInput v-model.number="state.amount" type="number" placeholder="0.00" min="0" step="0.01" />
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="تاريخ الإصدار" name="issueDate">
                  <UInput v-model="state.issueDate" type="date" />
                </UFormField>

                <UFormField label="تاريخ الاستحقاق" name="dueDate">
                  <UInput v-model="state.dueDate" type="date" />
                </UFormField>
              </div>

              <UFormField label="الحالة" name="status">
                <USelect
                  v-model="state.status"
                  :items="[
                    { label: 'مدفوعة', value: 'paid' },
                    { label: 'قيد الانتظار', value: 'pending' },
                    { label: 'متأخرة', value: 'overdue' }
                  ]"
                />
              </UFormField>

              <UFormField label="ملاحظات" name="notes">
                <UTextarea v-model="state.notes" placeholder="ملاحظات (اختياري)" :rows="3" />
              </UFormField>

              <div class="flex justify-end gap-2 pt-4">
                <UButton
                  label="إلغاء"
                  color="neutral"
                  variant="ghost"
                  @click="isAddModalOpen = false"
                />
                <UButton
                  label="إضافة"
                  type="submit"
                  :loading="isLoading"
                />
              </div>
            </UForm>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- تعديل الفاتورة Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isEditModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="isEditModalOpen = false">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  تعديل الفاتورة
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  حدّث بيانات الفاتورة
                </p>
              </div>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="isEditModalOpen = false"
              />
            </div>

            <UForm
              :schema="schema"
              :state="state"
              class="space-y-4"
              @submit="onSubmitEdit"
            >
              <UFormField label="رقم الفاتورة" name="id">
                <UInput v-model="state.id" placeholder="أدخل رقم الفاتورة" disabled />
              </UFormField>

              <UFormField label="اسم العميل" name="customerName">
                <USelectMenu
                  v-model="state.customerName"
                  :options="customerOptions"
                  placeholder="اختر العميل"
                  searchable
                />
              </UFormField>

              <UFormField label="المبلغ (₺)" name="amount">
                <UInput v-model.number="state.amount" type="number" placeholder="0.00" min="0" step="0.01" />
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="تاريخ الإصدار" name="issueDate">
                  <UInput v-model="state.issueDate" type="date" />
                </UFormField>

                <UFormField label="تاريخ الاستحقاق" name="dueDate">
                  <UInput v-model="state.dueDate" type="date" />
                </UFormField>
              </div>

              <UFormField label="الحالة" name="status">
                <USelect
                  v-model="state.status"
                  :items="[
                    { label: 'مدفوعة', value: 'paid' },
                    { label: 'قيد الانتظار', value: 'pending' },
                    { label: 'متأخرة', value: 'overdue' }
                  ]"
                />
              </UFormField>

              <UFormField label="ملاحظات" name="notes">
                <UTextarea v-model="state.notes" placeholder="ملاحظات (اختياري)" :rows="3" />
              </UFormField>

              <div class="flex justify-end gap-2 pt-4">
                <UButton
                  label="إلغاء"
                  color="neutral"
                  variant="ghost"
                  @click="isEditModalOpen = false"
                />
                <UButton
                  label="تحديث"
                  type="submit"
                  :loading="isLoading"
                />
              </div>
            </UForm>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- تفاصيل الفاتورة Modal -->
  <UModal v-model:open="isViewModalOpen" title="تفاصيل الفاتورة" size="lg">
    <div v-if="selectedInvoice" class="space-y-4">
      <!-- العنوان -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">رقم الفاتورة</p>
          <p class="text-lg font-semibold">{{ selectedInvoice.id }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">الحالة</p>
          <UBadge :color="getStatusColor(selectedInvoice.status)" variant="subtle">
            {{ getStatusLabel(selectedInvoice.status) }}
          </UBadge>
        </div>
      </div>

      <USeparator />

      <!-- بيانات العميل -->
      <div>
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">بيانات العميل</p>
        <p>{{ selectedInvoice.customerName }}</p>
      </div>

      <USeparator />

      <!-- التواريخ -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">تاريخ الإصدار</p>
          <p class="font-semibold">{{ new Date(selectedInvoice.issueDate).toLocaleDateString('ar') }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">تاريخ الاستحقاق</p>
          <p class="font-semibold">{{ new Date(selectedInvoice.dueDate).toLocaleDateString('ar') }}</p>
        </div>
      </div>

      <div v-if="selectedInvoice.paidDate">
        <p class="text-sm text-gray-500 dark:text-gray-400">تاريخ الدفع</p>
        <p class="font-semibold">{{ new Date(selectedInvoice.paidDate).toLocaleDateString('ar') }}</p>
      </div>

      <USeparator />

      <!-- البنود -->
      <div v-if="selectedInvoice.items && selectedInvoice.items.length > 0">
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">بنود الفاتورة</p>
        <div class="space-y-2">
          <div v-for="(item, index) in selectedInvoice.items" :key="index" class="flex justify-between items-start p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div>
              <p class="font-medium">{{ item.description }}</p>
              <p class="text-sm text-gray-500">{{ item.quantity }} x ₺{{ item.unitPrice.toFixed(2) }}</p>
            </div>
            <p class="font-semibold">₺{{ item.total.toFixed(2) }}</p>
          </div>
        </div>
        <USeparator />
      </div>

      <!-- إجمالي -->
      <div class="bg-primary/10 p-4 rounded-lg">
        <div class="flex justify-between items-center">
          <p class="text-lg font-semibold">إجمالي المبلغ:</p>
          <p class="text-2xl font-bold text-primary">₺{{ selectedInvoice.amount.toFixed(2) }}</p>
        </div>
      </div>

      <!-- ملاحظات -->
      <div v-if="selectedInvoice.notes">
        <p class="text-sm text-gray-500 dark:text-gray-400">ملاحظات</p>
        <p class="text-sm">{{ selectedInvoice.notes }}</p>
      </div>

      <!-- الأزرار -->
      <div class="flex gap-2 pt-4">
        <UButton
          icon="i-lucide-download"
          label="تنزيل"
          color="success"
          variant="soft"
          @click="downloadInvoice(selectedInvoice)"
        />
        <UButton
          label="إغلاق"
          color="neutral"
          variant="ghost"
          @click="isViewModalOpen = false"
        />
      </div>
    </div>
  </UModal>
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
